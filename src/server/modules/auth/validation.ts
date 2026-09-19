import { z } from 'zod'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/server/crypto/password'
import { safeText } from '@/server/common/validation'

/**
 * Authentication schemas.
 *
 * NOTE: this build has no OTP. Identity is phone + password, per an explicit
 * product decision recorded in docs/security.md. Phone numbers are therefore
 * self-asserted and unverified.
 */

const phoneSchema = z
  .string()
  .trim()
  .min(4, 'Enter a mobile number')
  .max(20, 'That does not look like a mobile number')

/**
 * Password policy: length only.
 *
 * Deliberately no "must contain a symbol and a digit" rule. Composition
 * rules push people toward `Password1!` and are worse than a length floor;
 * NIST SP 800-63B recommends against them.
 */
const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .max(MAX_PASSWORD_LENGTH, 'Password is too long')

export const registerSchema = z
  .strictObject({
    name: safeText(80).pipe(z.string().min(1, 'Enter your name')),
    phone: phoneSchema,
    password: passwordSchema,
  })

export const loginSchema = z.strictObject({
  phone: phoneSchema,
  password: z.string().min(1, 'Enter your password').max(MAX_PASSWORD_LENGTH),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
