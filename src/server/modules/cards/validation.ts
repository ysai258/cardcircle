import { z } from 'zod'
import {
  binSchema,
  discoverabilitySchema,
  expirySchema,
  last4Schema,
  safeText,
  uuidSchema,
  visibilitySchema,
} from '@/server/common/validation'

/**
 * Card schemas.
 *
 * Every object is `strict`: an unknown key is a validation error, not
 * something quietly dropped. That is what stops a client from probing with
 * `{"include": ["pan", "cvv"]}` or trying to set `ownerId` — the request is
 * rejected outright rather than partially honoured.
 *
 * There is no field here for a card number, CVV, PIN or OTP, and there must
 * never be one.
 */

export const createCardSchema = z.strictObject({
  bankId: uuidSchema,
  nickname: safeText(100).pipe(z.string().min(1, 'Give this card a nickname')),
  variant: safeText(100).nullish(),
  cardType: z.enum(['credit', 'debit']),
  network: z.enum(['visa', 'mastercard', 'rupay', 'amex']),
  bin: binSchema,
  last4: last4Schema,
  /** Optional. Stored encrypted, shared only on explicit opt-in. */
  expiry: expirySchema.nullish(),
  discoverability: discoverabilitySchema.default('everyone'),
  expiryVisibility: visibilitySchema.default('nobody'),
})

/**
 * Updates are a partial of create, minus the fields that must not move.
 *
 * `ownerId` is absent by construction — ownership is taken from the session,
 * never from the request body, so a card cannot be reassigned to another
 * user by a crafted PATCH.
 */
export const updateCardSchema = createCardSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one field to update',
)

export const updateSharingSchema = z.strictObject({
  discoverability: discoverabilitySchema.optional(),
  expiryVisibility: visibilitySchema.optional(),
})

export const cardFiltersSchema = z.strictObject({
  cardType: z.enum(['credit', 'debit']).optional(),
  network: z.enum(['visa', 'mastercard', 'rupay', 'amex']).optional(),
  /** Prefix search: 1-6 digits. */
  bin: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'BIN search must be 1-6 digits')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type CardFilters = z.infer<typeof cardFiltersSchema>
