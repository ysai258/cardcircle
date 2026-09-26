import type { CardRow, FieldVisibility, Visibility } from '@/db/schema'
import type {
  BankDTO,
  CardSummaryDTO,
  CardView,
  OwnerDTO,
  ProductDTO,
  Relationship,
  SharedPhoneDTO,
} from './dto'

/**
 * THE authorisation resolver.
 *
 * The single authoritative place deciding which card fields a requester may
 * receive. Controllers, React components and queries must not re-implement
 * any part of this decision.
 *
 * It is a PURE function: no database handle, no `await`, no logger, no
 * environment access. Decryption is injected. Every branch is therefore
 * reachable from a plain unit test with plain objects, so "a stranger cannot
 * see a masked BIN" is an assertion rather than a hope.
 *
 * `null` means the requester gets a 404. Private card, blocking, disabled
 * owner and "no such card" are deliberately indistinguishable on the wire; a
 * 403 would confirm the card exists.
 */

export type CardOwnerInput = {
  id: string
  name: string
  status: 'active' | 'disabled'
  phoneVisibility: Visibility
  phoneCt: Buffer
  phoneCountryCode: string
  phoneLast4: string
  phoneVerifiedAt: Date | null
}

/**
 * Decryption is injected rather than imported so the resolver stays pure and
 * key-free — and so it is only invoked on a branch that has already decided
 * the requester is entitled to the value.
 */
export type CardViewDeps = {
  decryptPhone: (blob: Buffer) => string
  maskPhone: (countryCode: string, last4: string) => string
}

export type CardViewInput = {
  /** null when the request is unauthenticated. */
  requesterId: string | null
  card: CardRow
  bank: BankDTO
  product: ProductDTO
  owner: CardOwnerInput
  relationship: Relationship
}

function buildOwnerDTO(owner: CardOwnerInput): OwnerDTO {
  return { id: owner.id, name: owner.name }
}

/**
 * Decides whether the BIN is released.
 *
 * Separate and named because it is the new field-level control, and a rule
 * this small is easier to audit standing on its own than buried in a branch.
 */
export function canSeeBin(
  visibility: FieldVisibility,
  relationship: Relationship,
): boolean {
  if (relationship === 'self') return true
  if (relationship === 'blocked') return false

  switch (visibility) {
    case 'everyone':
      return true
    case 'friends':
      return relationship === 'friends'
    case 'nobody':
      return false
  }
}

/** The safe subset, assembled field by field. Never a spread of `card`. */
function buildSummary(
  card: CardRow,
  bank: BankDTO,
  product: ProductDTO,
  owner: CardOwnerInput,
  cardType: CardSummaryDTO['cardType'],
): CardSummaryDTO {
  return {
    id: card.id,
    bank: {
      id: bank.id,
      name: bank.name,
      code: bank.code,
      logoUrl: bank.logoUrl,
    },
    product: {
      id: product.id,
      name: product.name,
      isVerified: product.isVerified,
      url: product.url,
    },
    cardType,
    network: card.network,
    owner: buildOwnerDTO(owner),
  }
}

export function buildCardView(
  input: CardViewInput & { cardType: CardSummaryDTO['cardType'] },
  deps: CardViewDeps,
): CardView | null {
  const { requesterId, card, bank, product, owner, relationship } = input

  // 1. Discovery requires authentication. There is no anonymous card access.
  if (requesterId === null) return null

  // 2. The owner always sees their own card in full.
  if (relationship === 'self') {
    return {
      kind: 'owner',
      card: {
        ...buildSummary(card, bank, product, owner, input.cardType),
        bin: card.bin,
        binVisibility: card.binVisibility,
        discoverability: card.discoverability,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      },
    }
  }

  // 3. A block in EITHER direction ends the conversation, checked before
  //    discoverability so a blocked user cannot confirm the card exists.
  if (relationship === 'blocked') return null

  // 4. A disabled owner disappears from everyone else's view.
  if (owner.status !== 'active') return null

  const isFriend = relationship === 'friends'

  // 5. Apply the owner's discovery setting.
  if (card.discoverability === 'nobody') return null
  if (card.discoverability === 'friends' && !isFriend) return null

  // 6. Field-level permissions, each opt-in.
  const shared: { phone?: SharedPhoneDTO } = {}

  if (isFriend && owner.phoneVisibility === 'friends') {
    shared.phone = {
      e164: deps.decryptPhone(owner.phoneCt),
      masked: deps.maskPhone(owner.phoneCountryCode, owner.phoneLast4),
      verified: owner.phoneVerifiedAt !== null,
    }
  }

  const binVisible = canSeeBin(card.binVisibility, relationship)

  // 7. Assemble the safe DTO. `bin` is added only when released, so a
  //    masked BIN is absent from the payload rather than blanked in it.
  return {
    kind: 'visitor',
    card: {
      ...buildSummary(card, bank, product, owner, input.cardType),
      ...(binVisible ? { bin: card.bin } : {}),
      access: {
        relationship,
        canViewSharedDetails: isFriend,
        canSendFriendRequest: relationship === 'none',
        binVisible,
      },
      shared,
    },
  }
}

/**
 * Derives the relationship between two users from the raw relationship rows.
 *
 * Kept beside the resolver, and equally pure, because the two decisions are
 * inseparable: getting `blocked` wrong here would silently unlock every
 * branch above.
 */
export function resolveRelationship(input: {
  requesterId: string
  ownerId: string
  blockExists: boolean
  friendship: {
    requesterId: string
    recipientId: string
    status: 'pending' | 'accepted' | 'rejected'
  } | null
}): Relationship {
  if (input.requesterId === input.ownerId) return 'self'

  // Blocking outranks everything, including an existing friendship.
  if (input.blockExists) return 'blocked'

  const friendship = input.friendship
  if (!friendship) return 'none'
  if (friendship.status === 'accepted') return 'friends'

  if (friendship.status === 'pending') {
    return friendship.requesterId === input.requesterId
      ? 'request_sent'
      : 'request_received'
  }

  // A rejected request leaves no standing relationship; the row survives
  // only so re-request throttling has something to read.
  return 'none'
}
