import { z } from 'zod'
import {
  binSchema,
  discoverabilitySchema,
  httpsUrl,
  safeText,
  uuidSchema,
} from '@/server/common/validation'

/**
 * Card schemas.
 *
 * Every object is `strict`: an unknown key is a validation error, not
 * something quietly dropped. That is what stops a client probing with
 * `{"include": ["pan", "cvv"]}` or trying to set `ownerId` — the request is
 * rejected outright rather than partially honoured.
 *
 * There is no field here for a card number, CVV, PIN, OTP, last-4 or expiry
 * date. The last two were removed deliberately: nothing in this product
 * needs them.
 */

export const fieldVisibilitySchema = z.enum(['nobody', 'friends', 'everyone'])

/** Shared between create and update so the two cannot drift. */
const cardFields = {
  bankId: uuidSchema,
  cardType: z.enum(['credit', 'debit']),
  /** One of the catalogue's products… */
  productId: uuidSchema.optional(),
  /** …or a new name, when the user picked "Other". */
  otherProductName: safeText(120).nullish(),
  /**
   * The issuer's page for that card, when the user knows it. Optional: not
   * every card has a page, and a required field would just collect junk.
   *
   * The host is checked against the bank's own domains in the service, where
   * the bank row is in hand. A link CardCircle shows to someone's friends
   * has to point at the bank, or this app becomes a way to deliver a
   * convincing phishing page.
   */
  otherProductUrl: httpsUrl(400),
  network: z.enum(['visa', 'mastercard', 'rupay', 'amex']),
  bin: binSchema,
  /** Who may see the first six digits. */
  binVisibility: fieldVisibilitySchema.default('friends'),
  discoverability: discoverabilitySchema.default('everyone'),
}

/** A card must name a product one way or the other. */
function requiresAProduct<T extends { productId?: string; otherProductName?: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
): void {
  if (!value.productId && !value.otherProductName) {
    ctx.addIssue({
      code: 'custom',
      path: ['productId'],
      message: 'Choose your card, or pick "Other" and name it',
    })
  }
}

export const createCardSchema = z
  .strictObject(cardFields)
  .superRefine(requiresAProduct)

/**
 * Updates are a partial of the same fields.
 *
 * `ownerId` is absent by construction — ownership comes from the session, so
 * a card cannot be reassigned to another user by a crafted PATCH.
 */
export const updateCardSchema = z
  .strictObject(cardFields)
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'Provide at least one field to update',
  )

export const updateSharingSchema = z.strictObject({
  discoverability: discoverabilitySchema.optional(),
  binVisibility: fieldVisibilitySchema.optional(),
})

export const cardFiltersSchema = z.strictObject({
  cardType: z.enum(['credit', 'debit']).optional(),
  network: z.enum(['visa', 'mastercard', 'rupay', 'amex']).optional(),
  /** BIN prefix search: 1-6 digits. */
  bin: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'BIN search must be 1-6 digits')
    .optional(),
  /** Free text over bank and product names, for the home search. */
  q: safeText(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export const productQuerySchema = z.strictObject({
  bankId: uuidSchema,
  cardType: z.enum(['credit', 'debit']),
})

export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type CardFilters = z.infer<typeof cardFiltersSchema>
