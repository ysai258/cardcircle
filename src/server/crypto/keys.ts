import 'server-only'
import { hkdfSync } from 'node:crypto'
import { env } from '@/env'

/**
 * Key derivation.
 *
 * One secret lives in the environment (APP_MASTER_KEY). Every key the app
 * actually uses is derived from it with HKDF-SHA256 (RFC 5869) under a
 * distinct `info` label. This gives us purpose-separated keys without asking
 * an operator to manage four secrets, and guarantees that the HMAC key and
 * the AES key are cryptographically independent.
 *
 * Purpose labels are versioned so a future key rotation can derive `-v2`
 * alongside `-v1` and migrate rows without a flag day.
 */
export const KEY_PURPOSES = [
  'phone-hmac-v1',
  'phone-enc-v1',
  'expiry-enc-v1',
] as const

export type KeyPurpose = (typeof KEY_PURPOSES)[number]

const KEY_LENGTH_BYTES = 32

/** Fixed, non-secret application salt. HKDF salts need not be secret. */
const HKDF_SALT = Buffer.from('cardcircle.hkdf.v1', 'utf8')

const derivedKeys = new Map<KeyPurpose, Buffer>()

function masterKey(): Buffer {
  return Buffer.from(env.APP_MASTER_KEY, 'base64')
}

/** Derives (and memoises) the 32-byte key for a given purpose. */
export function deriveKey(purpose: KeyPurpose): Buffer {
  const cached = derivedKeys.get(purpose)
  if (cached) return cached

  const key = Buffer.from(
    hkdfSync(
      'sha256',
      masterKey(),
      HKDF_SALT,
      Buffer.from(purpose, 'utf8'),
      KEY_LENGTH_BYTES,
    ),
  )

  derivedKeys.set(purpose, key)
  return key
}
