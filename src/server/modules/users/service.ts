import 'server-only'
import { and, asc, count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { banks, cards, users, type Visibility } from '@/db/schema'
import { notFound } from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { decryptPhone, maskPhone, normalizePhone, phoneHmac } from '@/server/crypto/phone'
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
          .innerJoin(cards, eq(cards.bankId, banks.id))
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
          .innerJoin(cards, eq(cards.bankId, banks.id))
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
