import 'server-only'
import { randomInt } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { recoveryCodes, users } from '@/db/schema'
import { AppError, ERROR_CODES } from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { hashPassword } from '@/server/crypto/password'
import { normalizePhone, phoneHmac } from '@/server/crypto/phone'
import { hashToken } from '@/server/crypto/tokens'
import { recordAuditEvent } from '@/server/modules/audit/service'
import { revokeAllSessions } from './session'

/**
 * Account recovery without a messaging channel.
 *
 * With no OTP and no email there is nowhere to send a reset link, so
 * recovery rests on something the user keeps: a set of single-use codes,
 * shown once at sign-up and never retrievable afterwards.
 */

export const RECOVERY_CODE_COUNT = 8

/**
 * Crockford base32 minus I, L, O and U — the characters people misread as
 * 1, 1, 0, and the one that forms unfortunate words. Codes get read off
 * paper and typed by hand, so the alphabet matters more than the extra bits.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const GROUPS = 3
const GROUP_LENGTH = 4

/**
 * 12 characters from a 32-symbol alphabet is 60 bits of entropy — far beyond
 * guessing, especially behind the reset rate limit.
 *
 * randomInt() is used rather than `Math.random()` or a modulo of random
 * bytes: it is cryptographically secure AND rejection-samples internally, so
 * the distribution over the alphabet stays uniform.
 */
function generateCode(): string {
  const groups: string[] = []

  for (let g = 0; g < GROUPS; g += 1) {
    let group = ''
    for (let i = 0; i < GROUP_LENGTH; i += 1) {
      group += ALPHABET[randomInt(ALPHABET.length)]
    }
    groups.push(group)
  }

  return groups.join('-')
}

/** Accepts the code however the user types it: spaces, case, missing dashes. */
export function normalizeCode(input: string): string {
  const stripped = input.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const groups: string[] = []
  for (let i = 0; i < stripped.length; i += GROUP_LENGTH) {
    groups.push(stripped.slice(i, i + GROUP_LENGTH))
  }
  return groups.join('-')
}

/**
 * Replaces a user's recovery codes and returns the new ones in plaintext.
 *
 * This is the ONLY moment the codes exist in readable form. Callers must
 * show them to the user immediately; they cannot be recovered later.
 *
 * Issuing new codes invalidates every old one, so a user who believes their
 * codes leaked can rotate them.
 */
export async function issueRecoveryCodes(
  userId: string,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string[]> {
  const database = tx ?? db
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateCode)

  await database.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))
  await database.insert(recoveryCodes).values(
    codes.map((code) => ({
      userId,
      codeSha256: hashToken(code),
    })),
  )

  return codes
}

export async function regenerateRecoveryCodes(
  userId: string,
): Promise<string[]> {
  const codes = await issueRecoveryCodes(userId)

  await recordAuditEvent({
    action: 'recovery_codes_generated',
    actorUserId: userId,
    resourceType: 'user',
    resourceId: userId,
    metadata: { count: codes.length },
  })

  return codes
}

export async function countUnusedCodes(userId: string): Promise<number> {
  const rows = await db
    .select({ id: recoveryCodes.id })
    .from(recoveryCodes)
    .where(
      and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)),
    )

  return rows.length
}

/**
 * A single message for every failure mode.
 *
 * Wrong phone, wrong code, already-used code and disabled account are
 * indistinguishable — otherwise this endpoint becomes an oracle for which
 * numbers are registered, which is exactly what the search limits exist to
 * prevent.
 */
const RESET_REJECTED =
  'That mobile number and recovery code combination is not valid.'

export async function resetPasswordWithRecoveryCode(input: {
  phone: string
  code: string
  newPassword: string
  clientId: string
}): Promise<void> {
  await enforceRateLimit('passwordReset', input.clientId)

  const phone = normalizePhone(input.phone)
  if (phone) {
    await enforceRateLimit('passwordReset', `phone:${phone.e164}`)
  }

  if (!phone) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, RESET_REJECTED)
  }

  const [user] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.phoneHmac, phoneHmac(phone.e164)))
    .limit(1)

  if (!user || user.status !== 'active') {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, RESET_REJECTED)
  }

  const codeHash = hashToken(normalizeCode(input.code))

  // Hash the new password before opening the transaction: Argon2 takes
  // ~75ms, and holding a row lock for that long is needless.
  const passwordHash = await hashPassword(input.newPassword)

  const consumed = await db.transaction(async (tx) => {
    // Marking the code used and requiring it to be unused in the same
    // statement makes this atomic: two concurrent requests with the same
    // code cannot both succeed.
    const rows = await tx
      .update(recoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(recoveryCodes.userId, user.id),
          eq(recoveryCodes.codeSha256, codeHash),
          isNull(recoveryCodes.usedAt),
        ),
      )
      .returning({ id: recoveryCodes.id })

    if (rows.length === 0) return false

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return true
  })

  if (!consumed) {
    await recordAuditEvent({
      action: 'user_login_failed',
      actorUserId: user.id,
      metadata: { reason: 'bad_recovery_code' },
    })
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, RESET_REJECTED)
  }

  // Anyone holding a session from before the reset loses it. If the reset
  // happened because the account was compromised, leaving those alive would
  // defeat the point.
  await revokeAllSessions(user.id)

  await recordAuditEvent({
    action: 'password_reset',
    actorUserId: user.id,
    resourceType: 'user',
    resourceId: user.id,
  })
}
