import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, safeEqual } from '@/server/crypto/aead'
import { deriveKey, KEY_PURPOSES } from '@/server/crypto/keys'
import { hashPassword, verifyPassword } from '@/server/crypto/password'
import {
  decryptPhone,
  encryptPhone,
  maskPhone,
  normalizePhone,
  phoneHmac,
} from '@/server/crypto/phone'
import { generateToken, hashToken } from '@/server/crypto/tokens'

describe('Key derivation', () => {
  it('derives a distinct 32-byte key per purpose', () => {
    const keys = KEY_PURPOSES.map((purpose) => deriveKey(purpose))

    for (const key of keys) {
      expect(key).toHaveLength(32)
    }

    const distinct = new Set(keys.map((key) => key.toString('hex')))
    expect(distinct.size).toBe(KEY_PURPOSES.length)
  })

  it('is deterministic for the same purpose', () => {
    expect(deriveKey('phone-enc-v1')).toEqual(deriveKey('phone-enc-v1'))
  })
})

describe('AES-256-GCM', () => {
  it('round-trips a value', () => {
    expect(decrypt('expiry-enc-v1', encrypt('expiry-enc-v1', '08/29'))).toBe(
      '08/29',
    )
  })

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encrypt('expiry-enc-v1', '08/29')
    const b = encrypt('expiry-enc-v1', '08/29')

    expect(a.equals(b)).toBe(false)
    expect(decrypt('expiry-enc-v1', a)).toBe(decrypt('expiry-enc-v1', b))
  })

  it('never leaves the plaintext visible in the ciphertext', () => {
    const blob = encrypt('phone-enc-v1', '+919876543210')
    expect(blob.toString('utf8')).not.toContain('9876543210')
    expect(blob.toString('hex')).not.toContain(
      Buffer.from('+919876543210').toString('hex'),
    )
  })

  it('refuses to decrypt a value encrypted for a different purpose', () => {
    // The purpose is bound in as AAD, so a phone ciphertext copied into the
    // expiry column fails authentication rather than yielding a value.
    const phoneBlob = encrypt('phone-enc-v1', '+919876543210')

    expect(() => decrypt('expiry-enc-v1', phoneBlob)).toThrow()
  })

  it('rejects a tampered ciphertext', () => {
    const blob = encrypt('expiry-enc-v1', '08/29')
    blob[blob.length - 1] ^= 0xff

    expect(() => decrypt('expiry-enc-v1', blob)).toThrow()
  })

  it('rejects a tampered auth tag', () => {
    const blob = encrypt('expiry-enc-v1', '08/29')
    blob[14] ^= 0xff

    expect(() => decrypt('expiry-enc-v1', blob)).toThrow()
  })

  it('rejects a truncated blob', () => {
    const blob = encrypt('expiry-enc-v1', '08/29')
    expect(() => decrypt('expiry-enc-v1', blob.subarray(0, 10))).toThrow(
      /truncated/i,
    )
  })

  it('rejects an unknown version byte', () => {
    const blob = encrypt('expiry-enc-v1', '08/29')
    blob[0] = 0x99

    expect(() => decrypt('expiry-enc-v1', blob)).toThrow(/version/i)
  })
})

describe('safeEqual', () => {
  it('compares correctly and handles length mismatch', () => {
    expect(safeEqual(Buffer.from('abc'), Buffer.from('abc'))).toBe(true)
    expect(safeEqual(Buffer.from('abc'), Buffer.from('abd'))).toBe(false)
    expect(safeEqual(Buffer.from('abc'), Buffer.from('abcd'))).toBe(false)
  })
})

describe('Phone normalisation', () => {
  it('collapses the forms Indian users actually type', () => {
    for (const input of [
      '9876543210',
      '+919876543210',
      '09876543210',
      '+91 98765 43210',
      '  9876543210  ',
    ]) {
      expect(normalizePhone(input)?.e164).toBe('+919876543210')
    }
  })

  it('extracts the country code and last four digits', () => {
    const phone = normalizePhone('9876543210')
    expect(phone?.countryCode).toBe('91')
    expect(phone?.last4).toBe('3210')
  })

  it('returns null for invalid input rather than throwing', () => {
    for (const input of ['', '   ', 'abc', '12', '00000']) {
      expect(normalizePhone(input)).toBeNull()
    }
  })
})

describe('Phone lookup digest', () => {
  it('is deterministic, so exact lookup works', () => {
    expect(phoneHmac('+919876543210')).toEqual(phoneHmac('+919876543210'))
  })

  it('differs for different numbers', () => {
    expect(phoneHmac('+919876543210')).not.toEqual(phoneHmac('+919876543211'))
  })

  it('is not reversible to the plaintext number', () => {
    const digest = phoneHmac('+919876543210')
    expect(digest.toString('hex')).not.toContain('9876543210')
    expect(digest).toHaveLength(32)
  })

  it('differs from a plain unkeyed hash of the same value', () => {
    // If these matched, the digest would be brute-forceable across the
    // ~10^9 Indian mobile number space without the key.
    const unkeyed = createHash('sha256').update('+919876543210').digest()

    expect(phoneHmac('+919876543210')).not.toEqual(unkeyed)
  })
})

describe('Phone encryption and masking', () => {
  it('round-trips through encryption', () => {
    expect(decryptPhone(encryptPhone('+919876543210'))).toBe('+919876543210')
  })

  it('masks all but the last four digits', () => {
    expect(maskPhone('91', '3210')).toBe('+91 ••••••3210')
    expect(maskPhone('91', '3210')).not.toContain('9876')
  })
})

describe('Password hashing', () => {
  it('produces an argon2id hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('$argon2id$')).toBe(true)
  })

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true)
    expect(await verifyPassword(hash, 'wrong password here')).toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    const a = await hashPassword('same password value')
    const b = await hashPassword('same password value')

    expect(a).not.toBe(b)
    expect(await verifyPassword(a, 'same password value')).toBe(true)
    expect(await verifyPassword(b, 'same password value')).toBe(true)
  })

  it('never contains the plaintext', async () => {
    const hash = await hashPassword('hunter2-is-a-bad-password')
    expect(hash).not.toContain('hunter2')
  })

  it('returns false instead of throwing on a corrupt hash', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false)
    expect(await verifyPassword('', 'anything')).toBe(false)
  })

  it('rejects an over-long password instead of burning CPU on it', async () => {
    const huge = 'x'.repeat(5000)
    expect(await verifyPassword('$argon2id$whatever', huge)).toBe(false)
    await expect(hashPassword(huge)).rejects.toThrow(/maximum length/i)
  })
})

describe('Session tokens', () => {
  it('generates distinct, high-entropy tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()))
    expect(tokens.size).toBe(200)

    // 32 bytes base64url.
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(42)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('hashes deterministically and irreversibly', () => {
    const token = generateToken()

    expect(hashToken(token)).toEqual(hashToken(token))
    expect(hashToken(token)).toHaveLength(32)
    expect(hashToken(token).toString('hex')).not.toContain(token)
  })
})
