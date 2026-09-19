import 'server-only'
import { hash, verify } from '@node-rs/argon2'

/**
 * @node-rs/argon2 exports `Algorithm` and `Version` as ambient const enums,
 * which TypeScript forbids under `isolatedModules` (required by Next.js).
 * These are their values, verified against the library at install time; the
 * test suite asserts the produced hash is actually argon2id, so a future
 * version bump that changed them could not pass silently.
 */
const ALGORITHM_ARGON2ID = 2
const VERSION_0X13 = 1

/**
 * Password hashing.
 *
 * Argon2id with the OWASP Password Storage Cheat Sheet's recommended
 * second-choice parameters (19 MiB memory, 2 iterations, 1 degree of
 * parallelism). Measured at ~75ms on the development machine, which is a
 * reasonable ceiling for a serverless request.
 *
 * The salt is generated internally by argon2 and embedded in the encoded
 * hash string, so there is no separate salt column.
 */
const ARGON2_OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  version: VERSION_0X13,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

/**
 * Upper bound on accepted password length.
 *
 * Argon2 has no practical input limit, but accepting unbounded input lets a
 * client burn server CPU by posting megabytes. 1024 is far above any real
 * passphrase.
 */
export const MAX_PASSWORD_LENGTH = 1024
export const MIN_PASSWORD_LENGTH = 10

export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Password exceeds maximum length')
  }
  return hash(plaintext, ARGON2_OPTIONS)
}

/**
 * Verifies a password against an encoded argon2 hash.
 *
 * Returns false rather than throwing on a malformed or unrecognised hash, so
 * a corrupt row reads as "wrong password" instead of a 500 that tells an
 * attacker the account exists.
 */
export async function verifyPassword(
  encodedHash: string,
  plaintext: string,
): Promise<boolean> {
  if (plaintext.length > MAX_PASSWORD_LENGTH) return false
  try {
    return await verify(encodedHash, plaintext)
  } catch {
    return false
  }
}
