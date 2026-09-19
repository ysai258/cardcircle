/**
 * Client-side validation rules.
 *
 * These mirror the server's schemas so a user gets an answer as they type
 * instead of after a round trip. They are a convenience ONLY — every rule
 * here is enforced again in `src/server/`, which is the copy that decides
 * anything. Nothing may rely on these having run.
 */

export const MIN_PASSWORD_LENGTH = 8
export const MOBILE_DIGITS = 10

/** Mirrors extractMobileDigits() on the server. */
export function extractMobileDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function validateMobile(input: string): string | undefined {
  const digits = extractMobileDigits(input)

  if (digits.length === 0) return 'Enter your mobile number'
  if (digits.length < MOBILE_DIGITS) {
    const missing = MOBILE_DIGITS - digits.length
    return `${missing} more digit${missing === 1 ? '' : 's'} needed`
  }
  if (digits.length > MOBILE_DIGITS) {
    return `That is ${digits.length} digits — a mobile number has ${MOBILE_DIGITS}`
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Indian mobile numbers start with 6, 7, 8 or 9'
  }

  return undefined
}

export function validatePassword(value: string): string | undefined {
  if (value.length === 0) return 'Enter a password'
  if (value.length < MIN_PASSWORD_LENGTH) {
    const missing = MIN_PASSWORD_LENGTH - value.length
    return `${missing} more character${missing === 1 ? '' : 's'} needed`
  }
  return undefined
}

/**
 * Rough strength signal, shown as encouragement rather than a gate.
 *
 * Length dominates because it genuinely dominates: composition rules push
 * people toward `Password1!` and NIST SP 800-63B advises against enforcing
 * them. Nothing here blocks submission.
 */
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3
  label: string
}

export function passwordStrength(value: string): PasswordStrength {
  if (value.length < MIN_PASSWORD_LENGTH) return { score: 0, label: 'Too short' }

  const variety =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^a-zA-Z0-9]/.test(value))

  if (value.length >= 16 || (value.length >= 12 && variety >= 3)) {
    return { score: 3, label: 'Strong' }
  }
  if (value.length >= 12 || variety >= 3) return { score: 2, label: 'Good' }
  return { score: 1, label: 'Fair' }
}
