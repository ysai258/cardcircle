import { z } from 'zod'

/**
 * Shared validation primitives.
 *
 * Not marked `server-only`: the sign-up and card forms reuse these schemas
 * on the client for instant feedback. That client-side use is a convenience
 * only — every schema here is re-run on the server, which is the copy that
 * decides anything.
 */

/**
 * Matches a run of 12-19 digits, allowing the spaces and dashes people use
 * when typing a card number.
 *
 * CardCircle never asks for a PAN, but "Card nickname" is a free-text box
 * next to the words "card", and some users will paste their card number into
 * it. Rejecting the input is the only way to keep that out of the database —
 * a warning label does not stop it. The threshold starts at 12 because the
 * shortest real PAN (Maestro) is 12 digits; a 6-digit BIN and a 4-digit
 * last-4 are well clear of it.
 */
const PAN_LIKE = /(?:\d[ -]?){12,19}/

export function looksLikeCardNumber(value: string): boolean {
  return PAN_LIKE.test(value)
}

/** Free text that must not contain anything resembling a card number. */
export function safeText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !looksLikeCardNumber(value),
      'This looks like a full card number. CardCircle never needs your full card number — please use a nickname instead.',
    )
}

export const uuidSchema = z.uuid()

export const binSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'BIN must be exactly 6 digits')

export const last4Schema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'Last 4 must be exactly 4 digits')

/** "MM/YY". Month is validated to 01-12 by the pattern itself. */
export const expirySchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be in MM/YY format')

export const visibilitySchema = z.enum(['nobody', 'friends'])
export const discoverabilitySchema = z.enum(['nobody', 'friends', 'everyone'])

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Capped so a caller cannot request the entire inventory in one response.
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type Pagination = z.infer<typeof paginationSchema>

/**
 * Indian mobile number: exactly ten digits.
 *
 * Accepts the shapes people actually paste — `+91 98765 43210`,
 * `09876543210`, `98765-43210` — by stripping separators and a country or
 * trunk prefix first, then insisting on exactly ten digits beginning 6-9,
 * which is the range India assigns to mobiles.
 *
 * The transform outputs the bare ten digits; normalizePhone() turns that
 * into E.164 for hashing and storage.
 */
export const TEN_DIGIT_MOBILE = /^[6-9]\d{9}$/

export function extractMobileDigits(input: string): string {
  const digits = input.replace(/\D/g, '')

  // +91XXXXXXXXXX or 91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  // 0XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)

  return digits
}

export const mobileNumberSchema = z
  .string()
  .trim()
  .min(1, 'Enter your mobile number')
  .transform(extractMobileDigits)
  .refine(
    (digits) => digits.length === 10,
    'Mobile number must be exactly 10 digits',
  )
  .refine(
    (digits) => TEN_DIGIT_MOBILE.test(digits),
    'Indian mobile numbers start with 6, 7, 8 or 9',
  )
