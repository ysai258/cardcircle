import 'server-only'
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { deriveKey, type KeyPurpose } from './keys'

/**
 * Authenticated encryption for the two reversible secrets we store:
 * phone numbers and card expiry dates.
 *
 * AES-256-GCM via node:crypto. No home-grown constructions.
 *
 * Wire format (stored as bytea):
 *   [0]      version byte (0x01)
 *   [1..13)  96-bit IV
 *   [13..29) 128-bit GCM auth tag
 *   [29..]   ciphertext
 *
 * The key purpose is bound in as Additional Authenticated Data, so a
 * ciphertext written for `phone-enc-v1` cannot be decrypted as an expiry
 * date even by code that passes the wrong purpose. Copying a phone
 * ciphertext into the expiry column fails authentication instead of
 * silently producing a value.
 */

const VERSION = 0x01
const IV_BYTES = 12
const TAG_BYTES = 16
const HEADER_BYTES = 1 + IV_BYTES + TAG_BYTES

export function encrypt(purpose: KeyPurpose, plaintext: string): Buffer {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(purpose), iv, {
    authTagLength: TAG_BYTES,
  })
  cipher.setAAD(Buffer.from(purpose, 'utf8'))

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return Buffer.concat([
    Buffer.from([VERSION]),
    iv,
    cipher.getAuthTag(),
    ciphertext,
  ])
}

/** Throws if the blob is malformed, truncated, or fails authentication. */
export function decrypt(purpose: KeyPurpose, blob: Buffer): string {
  if (blob.length < HEADER_BYTES) {
    throw new Error('Ciphertext is truncated')
  }
  if (blob[0] !== VERSION) {
    throw new Error(`Unsupported ciphertext version: ${blob[0]}`)
  }

  const iv = blob.subarray(1, 1 + IV_BYTES)
  const tag = blob.subarray(1 + IV_BYTES, HEADER_BYTES)
  const ciphertext = blob.subarray(HEADER_BYTES)

  const decipher = createDecipheriv('aes-256-gcm', deriveKey(purpose), iv, {
    authTagLength: TAG_BYTES,
  })
  decipher.setAAD(Buffer.from(purpose, 'utf8'))
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}

/** Length-safe constant-time comparison. */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
