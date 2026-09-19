import type {
  CardNetwork,
  CardType,
  Discoverability,
  Visibility,
} from '@/db/schema'

/**
 * Response shapes.
 *
 * Every DTO here is built by explicit field assignment in
 * ./authorization.ts. Nothing spreads a database row. If a column is added
 * to the schema tomorrow, it appears in no response until someone writes a
 * line of code putting it there.
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

/**
 * The safe subset. Everything in here is discovery information that any
 * authorised viewer may see.
 *
 * DESIGN INVARIANT: this type has no field for expiry or phone, and must
 * never gain one. List endpoints return only this shape, which means no
 * amount of getting a list query wrong can leak a sensitive field — there
 * is nowhere in the type to put it.
 */
export type CardSummaryDTO = {
  id: string
  bank: BankDTO
  cardType: CardType
  network: CardNetwork
  bin: string
  last4: string
  nickname: string
  variant: string | null
  owner: OwnerDTO
}

/**
 * How the requester stands relative to the card's owner.
 *
 * `none` and the two pending states are all "not friends" for access
 * purposes, but the UI needs to tell them apart to decide whether to render
 * "Send request", "Request sent", or "Respond to request".
 */
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

/**
 * Fields released only on explicit owner opt-in.
 *
 * Absent keys mean "not shared". The API omits them rather than sending
 * null, so a client cannot distinguish "owner has no expiry recorded" from
 * "owner did not share it" — both are simply not there.
 */
export type CardSharedFieldsDTO = {
  expiry?: string
  phone?: SharedPhoneDTO
}

/** What a non-owner sees. */
export type CardDetailDTO = CardSummaryDTO & {
  access: CardAccessDTO
  shared: CardSharedFieldsDTO
}

/** What the owner sees of their own card: everything, plus the controls. */
export type OwnCardDTO = CardSummaryDTO & {
  discoverability: Discoverability
  expiry: string | null
  sharing: Record<'expiry', Visibility>
  createdAt: string
  updatedAt: string
}

/**
 * The result of an authorisation decision.
 *
 * `null` from the resolver means "this requester gets a 404" — whether the
 * card is private, the owner blocked them, or it does not exist.
 */
export type CardView =
  | { kind: 'owner'; card: OwnCardDTO }
  | { kind: 'visitor'; card: CardDetailDTO }
