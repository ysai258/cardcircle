import 'server-only'
import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { banks, cardProducts, cards, users, type Visibility } from '@/db/schema'
import {
  AppError,
  conflict,
  ERROR_CODES,
  notFound,
  validationFailed,
} from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { verifyPassword } from '@/server/crypto/password'
import {
  decryptPhone,
  encryptPhone,
  maskPhone,
  normalizePhone,
  phoneHmac,
} from '@/server/crypto/phone'
import { recordAuditEvent } from '@/server/modules/audit/service'
import { discoverableByRequester } from '@/server/modules/cards/discovery-predicate'
import type { Relationship } from '@/server/modules/cards/dto'
import { getRelationship } from '@/server/modules/friends/repository'

/**
 * User directory.
 *
 * The search endpoint is the most enumeration-sensitive surface in the
 * product: it necessarily confirms whether a phone number has an account.
 * Mitigations, in order of importance:
 *   1. exact-match only — never prefix or partial, so the number must
 *      already be known to the searcher;
 *   2. a tight rate limit (20/hour) making bulk sweeps impractical;
 *   3. an audit record of every search;
 *   4. authentication required, so searches are attributable.
 */

export type UserSearchResult = {
  id: string
  name: string
  avatarUrl: string | null
  relationship: Relationship
}

export async function searchUserByPhone(
  requesterId: string,
  rawPhone: string,
): Promise<UserSearchResult | null> {
  await enforceRateLimit('userSearch', requesterId)

  const phone = normalizePhone(rawPhone)
  if (!phone) return null

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(
      and(eq(users.phoneHmac, phoneHmac(phone.e164)), eq(users.status, 'active')),
    )
    .limit(1)

  await recordAuditEvent({
    action: 'user_searched',
    actorUserId: requesterId,
    targetUserId: row?.id ?? null,
    metadata: { found: row !== undefined },
  })

  if (!row) return null
  if (row.id === requesterId) {
    return { ...row, relationship: 'self' }
  }

  const relationship = await getRelationship(requesterId, row.id)

  // A blocked user is not discoverable at all, in either direction.
  if (relationship === 'blocked') return null

  return { ...row, relationship }
}

export type UserProfile = {
  id: string
  name: string
  avatarUrl: string | null
  relationship: Relationship
  /** Present only when the viewer is authorised. */
  phone?: { e164: string; masked: string; verified: boolean }
  banks: Array<{ id: string; name: string; code: string; cardCount: number }>
  totalCards: number
}

/**
 * Another user's profile.
 *
 * Card counts run through the same discovery predicate as every other
 * listing, so the totals shown here match what the viewer can actually open.
 */
export async function getUserProfile(
  requesterId: string,
  userId: string,
): Promise<UserProfile> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw notFound('User')

  const relationship = await getRelationship(requesterId, userId)

  if (relationship === 'blocked') throw notFound('User')
  if (user.status !== 'active' && relationship !== 'self') {
    throw notFound('User')
  }

  const bankRows =
    relationship === 'self'
      ? await db
          .select({
            id: banks.id,
            name: banks.name,
            code: banks.code,
            cardCount: count(cards.id),
          })
          .from(banks)
          .innerJoin(cardProducts, eq(cardProducts.bankId, banks.id))
          .innerJoin(cards, eq(cards.productId, cardProducts.id))
          .where(eq(cards.ownerId, userId))
          .groupBy(banks.id, banks.name, banks.code)
          .orderBy(asc(banks.name))
      : await db
          .select({
            id: banks.id,
            name: banks.name,
            code: banks.code,
            cardCount: count(cards.id),
          })
          .from(banks)
          .innerJoin(cardProducts, eq(cardProducts.bankId, banks.id))
          .innerJoin(cards, eq(cards.productId, cardProducts.id))
          .innerJoin(users, eq(users.id, cards.ownerId))
          .where(
            and(
              eq(cards.ownerId, userId),
              discoverableByRequester(requesterId),
            ),
          )
          .groupBy(banks.id, banks.name, banks.code)
          .orderBy(asc(banks.name))

  const banksList = bankRows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    cardCount: Number(row.cardCount),
  }))

  const profile: UserProfile = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    relationship,
    banks: banksList,
    totalCards: banksList.reduce((sum, bank) => sum + bank.cardCount, 0),
  }

  // Phone is released only to the owner, or to an accepted friend the owner
  // has opted in for. Decryption happens only on that branch.
  const maySeePhone =
    relationship === 'self' ||
    (relationship === 'friends' && user.phoneVisibility === 'friends')

  if (maySeePhone) {
    profile.phone = {
      e164: decryptPhone(user.phoneCt),
      masked: maskPhone(user.phoneCountryCode, user.phoneLast4),
      verified: user.phoneVerifiedAt !== null,
    }

    if (relationship !== 'self') {
      await recordAuditEvent({
        action: 'phone_revealed',
        actorUserId: requesterId,
        targetUserId: userId,
        resourceType: 'user',
        resourceId: userId,
      })
    }
  }

  return profile
}

export type MeDTO = {
  id: string
  name: string
  avatarUrl: string | null
  phone: { masked: string; verified: boolean }
  phoneVisibility: Visibility
  createdAt: string
}

/** The current user's own profile. Returns the MASKED phone, not the E.164. */
export function toMeDTO(user: typeof users.$inferSelect): MeDTO {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: {
      masked: maskPhone(user.phoneCountryCode, user.phoneLast4),
      verified: user.phoneVerifiedAt !== null,
    },
    phoneVisibility: user.phoneVisibility,
    createdAt: user.createdAt.toISOString(),
  }
}

export async function updatePhoneVisibility(
  userId: string,
  visibility: Visibility,
): Promise<void> {
  await db
    .update(users)
    .set({ phoneVisibility: visibility, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

/**
 * Permanently deletes the caller's account.
 *
 * Re-authentication is required even though the caller already holds a
 * session: this is irreversible, and a session alone is too weak a
 * confirmation for it (an unattended laptop should not be enough).
 *
 * The cascade removes cards, sharing settings, friendships, blocks, reports,
 * sessions and recovery codes. Audit rows survive with a NULL actor — the
 * security trail is retained, stripped of who it referred to, which is what
 * a right-to-erasure request actually requires.
 */
export async function deleteAccount(
  userId: string,
  password: string,
): Promise<void> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) throw notFound('User')

  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError(
      ERROR_CODES.UNAUTHENTICATED,
      'That password is not correct.',
    )
  }

  // Recorded BEFORE the delete: afterwards there is no user row to reference,
  // and the audit trail should show the account existed and was removed.
  await recordAuditEvent({
    action: 'account_deleted',
    actorUserId: userId,
    resourceType: 'user',
    resourceId: userId,
  })

  await db.delete(users).where(eq(users.id, userId))
}


/**
 * Changes the caller's mobile number.
 *
 * The number is this account's identity and its friend-lookup key, so this
 * is more than a profile edit:
 *
 *   - the password is required again, because someone with a borrowed
 *     session could otherwise move an account to a number they control;
 *   - the new number must be unused, enforced by the unique index on the
 *     HMAC rather than a read-then-write that could race;
 *   - the HMAC, ciphertext, country code and last four are all rewritten
 *     together, since a half-updated set would make the account unfindable;
 *   - friends keep their friendships — they are by user id, not number —
 *     but anyone holding only the OLD number can no longer find the account.
 */
export async function changePhoneNumber(input: {
  userId: string
  newPhone: string
  password: string
}): Promise<{ masked: string }> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)

  if (!user) throw notFound('User')

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError(
      ERROR_CODES.UNAUTHENTICATED,
      'That password is not correct.',
    )
  }

  const phone = normalizePhone(input.newPhone)
  if (!phone) {
    throw validationFailed('Enter a valid mobile number', [
      { field: 'newPhone', messages: ['Enter a valid mobile number'] },
    ])
  }

  try {
    await db
      .update(users)
      .set({
        phoneHmac: phoneHmac(phone.e164),
        phoneCt: encryptPhone(phone.e164),
        phoneCountryCode: phone.countryCode,
        phoneLast4: phone.last4,
        // A changed number is unverified again — not that this build
        // verifies any number, but the column must not imply otherwise.
        phoneVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId))
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('That mobile number is already in use')
    }
    throw error
  }

  await recordAuditEvent({
    action: 'phone_changed',
    actorUserId: input.userId,
    resourceType: 'user',
    resourceId: input.userId,
    // The number itself is never recorded here.
    metadata: { last4: phone.last4 },
  })

  return { masked: maskPhone(phone.countryCode, phone.last4) }
}

/**
 * Detects a Postgres unique-violation (SQLSTATE 23505).
 *
 * Walks the `cause` chain: Drizzle wraps failures in a DrizzleQueryError and
 * hangs the real PostgresError off `cause`, so reading only the top-level
 * code misses it — as it once did for duplicate registrations, which
 * surfaced as a 500 instead of a conflict.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; current !== null && depth < 5; depth += 1) {
    if (typeof current !== 'object') return false
    if ((current as { code?: string }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
