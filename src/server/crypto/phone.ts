import 'server-only'
import { createHmac } from 'node:crypto'
import { type CountryCode, parsePhoneNumberWithError } from 'libphonenumber-js'
import { decrypt, encrypt } from './aead'
import { deriveKey } from './keys'

/**
 * Phone number handling.
 *
 * A phone number is this product's primary identity and its friend-lookup
 * key, which pulls in two conflicting requirements: we must be able to find a
 * user by exact number, and we must not keep a plaintext directory of every
 * user's number.
 *
 * Resolution:
 *   - `phoneHmac`  — keyed HMAC-SHA256, used as the unique lookup index.
 *                    Deterministic (so lookup works) but not reversible, and
 *                    not brute-forceable without the key. An unkeyed hash
 *                    would be trivially reversible: the Indian mobile number
 *                    space is ~10^9, which is minutes of work on a GPU.
 *   - `phoneCt`    — AES-256-GCM, decrypted only when an authorised viewer
 *                    is shown the actual number for a `tel:` link.
 *   - `countryCode`+`last4` — stored in the clear so masked display
 *                    ("+91 ••••••3210") never requires decryption.
 */

const DEFAULT_COUNTRY: CountryCode = 'IN'

export type NormalizedPhone = {
  /** E.164, e.g. "+919876543210". */
  e164: string
  /** Calling code without "+", e.g. "91". */
  countryCode: string
  /** Final four digits, for masked display. */
  last4: string
}

/**
 * Normalises user input to E.164.
 *
 * Accepts the forms Indian users actually type — "9876543210",
 * "09876543210", "+91 98765 43210" — and collapses them to one canonical
 * value. Normalising before hashing is what makes the uniqueness constraint
 * meaningful; without it the same person could register three times.
 *
 * Returns null for anything unparseable or invalid rather than throwing, so
 * callers handle it as a validation failure.
 */
export function normalizePhone(
  input: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return null

  try {
    const parsed = parsePhoneNumberWithError(trimmed, defaultCountry)
    if (!parsed.isValid()) return null

    const e164 = parsed.number
    return {
      e164,
      countryCode: parsed.countryCallingCode.toString(),
      last4: e164.slice(-4),
    }
  } catch {
    return null
  }
}

/** Deterministic keyed lookup digest for an E.164 number. */
export function phoneHmac(e164: string): Buffer {
  return createHmac('sha256', deriveKey('phone-hmac-v1'))
    .update(e164, 'utf8')
    .digest()
}

export function encryptPhone(e164: string): Buffer {
  return encrypt('phone-enc-v1', e164)
}

export function decryptPhone(blob: Buffer): string {
  return decrypt('phone-enc-v1', blob)
}

/**
 * Builds the masked representation shown to users who may know that someone
 * has a number but are not authorised to see it.
 */
export function maskPhone(countryCode: string, last4: string): string {
  return `+${countryCode} ••••••${last4}`
}
