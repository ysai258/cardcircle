import { describe, expect, it } from 'vitest'
import {
  extractMobileDigits,
  mobileNumberSchema,
} from '@/server/common/validation'
import {
  extractMobileDigits as clientExtract,
  validateMobile,
  validatePassword,
  passwordStrength,
} from '@/lib/form-validation'

describe('Mobile number: exactly 10 digits', () => {
  const accepted = [
    ['9876543210', 'bare 10 digits'],
    ['+919876543210', 'E.164'],
    ['919876543210', 'country code, no plus'],
    ['09876543210', 'trunk prefix'],
    ['+91 98765 43210', 'spaced'],
    ['98765-43210', 'dashed'],
    ['  9876543210  ', 'padded'],
  ] as const

  for (const [input, description] of accepted) {
    it(`accepts ${description}`, () => {
      const result = mobileNumberSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe('9876543210')
    })
  }

  const rejected = [
    ['987654321', 'nine digits'],
    ['98765432101', 'eleven digits'],
    ['5876543210', 'starts with 5'],
    ['1234567890', 'starts with 1'],
    ['', 'empty'],
    ['abcdefghij', 'letters'],
  ] as const

  for (const [input, description] of rejected) {
    it(`rejects ${description}`, () => {
      expect(mobileNumberSchema.safeParse(input).success).toBe(false)
    })
  }

  it('explains what is wrong rather than just failing', () => {
    const short = mobileNumberSchema.safeParse('987654321')
    expect(short.success).toBe(false)
    if (!short.success) {
      expect(short.error.issues[0]?.message).toMatch(/exactly 10 digits/i)
    }

    const wrongStart = mobileNumberSchema.safeParse('5876543210')
    if (!wrongStart.success) {
      expect(wrongStart.error.issues[0]?.message).toMatch(/6, 7, 8 or 9/i)
    }
  })
})

describe('Client rules mirror the server', () => {
  // If these drift, users get told one thing and the server does another.
  const samples = [
    '9876543210',
    '+919876543210',
    '09876543210',
    '987654321',
    '98765432101',
    '5876543210',
    'nonsense',
    '',
  ]

  for (const sample of samples) {
    it(`agrees on "${sample}"`, () => {
      expect(clientExtract(sample)).toBe(extractMobileDigits(sample))

      const serverAccepts = mobileNumberSchema.safeParse(sample).success
      const clientAccepts = validateMobile(sample) === undefined
      expect(clientAccepts).toBe(serverAccepts)
    })
  }
})

describe('Password minimum is 8', () => {
  it('rejects 7 characters and accepts 8', () => {
    expect(validatePassword('1234567')).toMatch(/1 more character needed/)
    expect(validatePassword('12345678')).toBeUndefined()
  })

  it('counts down the characters still needed', () => {
    expect(validatePassword('123')).toMatch(/5 more characters needed/)
  })

  it('rates strength without ever blocking submission', () => {
    expect(passwordStrength('short').score).toBe(0)
    expect(passwordStrength('abcdefgh').score).toBeGreaterThanOrEqual(1)
    expect(passwordStrength('a-much-longer-passphrase-here').score).toBe(3)
  })
})
