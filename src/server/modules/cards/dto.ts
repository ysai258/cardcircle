import type { CardNetwork, CardType, Discoverability, FieldVisibility } from '@/db/schema'

/**
 * Response shapes.
 *
 * Every DTO here is built by explicit field assignment in
 * ./authorization.ts. Nothing spreads a database row, so a column added
 * tomorrow appears in no response until someone writes a line putting it
 * there.
 */

export type OwnerDTO = {
  id: string
  name: string
}

export type BankDTO = {
  id: string
  name: string
  code: string
  logoUrl: string | null
}

export type ProductDTO = {
  id: string
  name: string
  /** False for products a user added via "Other", pending review. */
  isVerified: boolean
  /**
   * The issuer's own page for this card, or null when none is on file.
   *
   * Not authorisation-gated, unlike `bin`: it is public catalogue data about
   * a card model, and says nothing about the person holding it. So it is
   * null rather than absent — absence in this codebase means "you were not
   * allowed to see this", and overloading it here would blur a distinction
   * worth keeping sharp.
   */
  url: string | null
}

/**
 * The safe subset.
 *
 * `bin` is OPTIONAL, and that is the whole point of BIN masking: when a
 * viewer is not entitled to the digits the key is absent from the payload
 * rather than blanked. The card is then known only as, say, "Airtel Axis
 * Bank · Credit · Visa", which is enough to answer an offer question
 * without publishing six digits of anyone's card.
 *
 * There is deliberately no field here for a last-4 or an expiry date. Those
 * columns no longer exist: under this product's framing your friend makes
 * the purchase, so nobody ever needs them.
 */
export type CardSummaryDTO = {
  id: string
  bank: BankDTO
  product: ProductDTO
  cardType: CardType
  network: CardNetwork
  /** Present only when the viewer may see it. */
  bin?: string
  owner: OwnerDTO
}

export type Relationship =
  | 'self'
  | 'friends'
  | 'request_sent'
  | 'request_received'
  | 'none'
  | 'blocked'

export type CardAccessDTO = {
  relationship: Relationship
  canViewSharedDetails: boolean
  canSendFriendRequest: boolean
  /** Whether the BIN was released to this viewer. */
  binVisible: boolean
}

export type SharedPhoneDTO = {
  /** E.164, for the tel: link. Present only when authorised. */
  e164: string
  masked: string
  /**
   * Always false in v1 — this build has no phone verification, so every
   * number is self-asserted. Surfaced so the UI can say so plainly rather
   * than implying CardCircle vouched for it.
   */
  verified: boolean
}

export type CardSharedFieldsDTO = {
  phone?: SharedPhoneDTO
}

/** What a non-owner sees. */
export type CardDetailDTO = CardSummaryDTO & {
  access: CardAccessDTO
  shared: CardSharedFieldsDTO
}

/** What the owner sees of their own card: everything, plus the controls. */
export type OwnCardDTO = CardSummaryDTO & {
  bin: string
  binVisibility: FieldVisibility
  discoverability: Discoverability
  createdAt: string
  updatedAt: string
}

export type CardView =
  | { kind: 'owner'; card: OwnCardDTO }
  | { kind: 'visitor'; card: CardDetailDTO }
