import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { AppError, ERROR_CODES, validationFailed } from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { hashPassword, verifyPassword } from '@/server/crypto/password'
import { encryptPhone, normalizePhone, phoneHmac } from '@/server/crypto/phone'
import { recordAuditEvent } from '@/server/modules/audit/service'
import { issueRecoveryCodes } from './recovery'
import { createSession, destroyCurrentSession } from './session'
import type { LoginInput, RegisterInput } from './validation'

/**
 * Authentication.
 *
 * Phone + password. This build has no OTP by explicit product decision, so
 * phone numbers are self-asserted; see docs/security.md for what that costs
 * and how it is mitigated.
 */

/**
 * A single message for every credential failure.
 *
 * Never "no account with that number" or "wrong password" — either would
 * turn the login form into an oracle for which phone numbers are registered.
 */
const CREDENTIALS_REJECTED = 'Incorrect mobile number or password'

/**
 * A dummy hash, verified against when no user matches.
 *
 * Without it, a request for an unregistered number returns in ~1ms while a
 * registered one takes ~75ms, and that timing difference is a usable
 * registration oracle. Doing the work either way flattens it.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9vYmFy'

/**
 * Detects a Postgres unique-violation (SQLSTATE 23505).
 *
 * Walks the `cause` chain rather than reading `error.code` directly: Drizzle
 * wraps failures from inside a transaction in a DrizzleQueryError and hangs
 * the real PostgresError off `cause`. Checking only the top-level code meant
 * a duplicate phone number escaped this branch and surfaced as a 500, so
 * anyone re-registering an existing number was told "Internal server error"
 * instead of "an account already exists".
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

export async function register(
  input: RegisterInput,
  clientId: string,
): Promise<{ userId: string; recoveryCodes: string[] }> {
  await enforceRateLimit('register', clientId)

  const phone = normalizePhone(input.phone)
  if (!phone) {
    throw validationFailed('Enter a valid mobile number', [
      { field: 'phone', messages: ['Enter a valid mobile number'] },
    ])
  }

  const passwordHash = await hashPassword(input.password)

  try {
    // One transaction: an account must never exist without recovery codes,
    // or a crash between the two writes would create exactly the permanent
    // lockout the codes exist to prevent.
    const { userId, codes } = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          name: input.name,
          phoneHmac: phoneHmac(phone.e164),
          phoneCt: encryptPhone(phone.e164),
          phoneCountryCode: phone.countryCode,
          phoneLast4: phone.last4,
          passwordHash,
          // phoneVerifiedAt stays NULL: nothing has verified this number.
        })
        .returning({ id: users.id })

      if (!created) throw new Error('User insert returned no row')

      return { userId: created.id, codes: await issueRecoveryCodes(created.id, tx) }
    })

    await recordAuditEvent({
      action: 'user_registered',
      actorUserId: userId,
      resourceType: 'user',
      resourceId: userId,
    })

    await createSession(userId)
    return { userId, recoveryCodes: codes }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'An account already exists for that mobile number',
      )
    }
    throw error
  }
}

export async function login(
  input: LoginInput,
  clientId: string,
): Promise<{ userId: string }> {
  const phone = normalizePhone(input.phone)

  // Rate limit on the number as well as the IP, so a botnet cannot spread a
  // password-spraying run for one account across many addresses.
  await enforceRateLimit('login', clientId)
  if (phone) {
    await enforceRateLimit('login', `phone:${phone.e164}`)
  }

  if (!phone) {
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, CREDENTIALS_REJECTED)
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phoneHmac, phoneHmac(phone.e164)))
    .limit(1)

  // Always run a verification, even with no user, to keep timing flat.
  const passwordOk = await verifyPassword(
    user?.passwordHash ?? DUMMY_HASH,
    input.password,
  )

  if (!user || !passwordOk) {
    await recordAuditEvent({
      action: 'user_login_failed',
      actorUserId: user?.id ?? null,
      metadata: { reason: user ? 'bad_password' : 'unknown_user' },
    })
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, CREDENTIALS_REJECTED)
  }

  if (user.status !== 'active') {
    // Same generic message: a disabled account should not be distinguishable.
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, CREDENTIALS_REJECTED)
  }

  await recordAuditEvent({
    action: 'user_logged_in',
    actorUserId: user.id,
    resourceType: 'user',
    resourceId: user.id,
  })

  await createSession(user.id)
  return { userId: user.id }
}

export async function logout(userId: string): Promise<void> {
  await destroyCurrentSession()
  await recordAuditEvent({ action: 'user_logged_out', actorUserId: userId })
}
