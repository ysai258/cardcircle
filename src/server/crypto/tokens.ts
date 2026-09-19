import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

/** 256 bits of entropy. */
const TOKEN_BYTES = 32

/**
 * Generates an opaque bearer token for a session cookie.
 *
 * base64url so it is safe in a Set-Cookie header without escaping.
 */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * Hashes a bearer token for storage.
 *
 * A session token is a credential: anyone holding the stored value could
 * impersonate the user, so the database stores only SHA-256 of it. A plain
 * hash (rather than argon2) is correct here because the input is 256 bits of
 * uniform randomness — there is no dictionary to attack, and session lookup
 * happens on every request.
 */
export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest()
}
