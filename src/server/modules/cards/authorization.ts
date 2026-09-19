import type { CardField, CardRow, Visibility } from '@/db/schema'
import type {
  BankDTO,
  CardSummaryDTO,
  CardView,
  OwnerDTO,
  Relationship,
  SharedPhoneDTO,
} from './dto'

/**
 * THE authorisation resolver.
 *
 * This is the single authoritative place that decides which card fields a
 * requester may receive. Controllers, React components and queries must not
 * re-implement any part of this decision.
 *
 * It is a PURE function: no database handle, no `await`, no logger, no
 * environment access. Decryption is injected. That purity is the point —
 * every branch below is reachable from a plain unit test with plain objects,
 * so "a non-friend cannot see expiry" is an assertion rather than a hope.
 *
 * Returning `null` means the requester gets a 404. Private card, blocking,
 * disabled owner and "no such card" are deliberately indistinguishable on
 * the wire; a 403 would confirm the card exists.
 */

/** The owner fields this decision needs. Nothing more is accepted. */
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
 * key-free. It is also why decryption is *lazy*: these are only called on a
 * branch that has already decided the requester is entitled to the value.
 */
export type CardViewDeps = {
  decryptExpiry: (blob: Buffer) => string
  decryptPhone: (blob: Buffer) => string
  maskPhone: (countryCode: string, last4: string) => string
}

export type CardViewInput = {
  /** null when the request is unauthenticated. */
  requesterId: string | null
  card: CardRow
  bank: BankDTO
  owner: CardOwnerInput
  relationship: Relationship
  sharing: ReadonlyMap<CardField, Visibility>
}

function buildOwnerDTO(owner: CardOwnerInput): OwnerDTO {
  return { id: owner.id, name: owner.name }
}

/** The safe subset, assembled field by field. Never a spread of `card`. */
function buildSummary(
  card: CardRow,
  bank: BankDTO,
  owner: CardOwnerInput,
): CardSummaryDTO {
  return {
    id: card.id,
    bank: {
      id: bank.id,
      name: bank.name,
      code: bank.code,
      logoUrl: bank.logoUrl,
    },
    cardType: card.cardType,
    network: card.network,
    bin: card.bin,
    last4: card.last4,
    nickname: card.nickname,
    variant: card.variant,
    owner: buildOwnerDTO(owner),
  }
}

export function buildCardView(
  input: CardViewInput,
  deps: CardViewDeps,
): CardView | null {
  const { requesterId, card, bank, owner, relationship, sharing } = input

  // 1. Discovery requires authentication. There is no anonymous card access.
  if (requesterId === null) return null

  // 2. The owner always sees their own card in full, regardless of
  //    discoverability or their own account status.
  if (relationship === 'self') {
    return {
      kind: 'owner',
      card: {
        ...buildSummary(card, bank, owner),
        discoverability: card.discoverability,
        expiry: card.expiryCt ? deps.decryptExpiry(card.expiryCt) : null,
        sharing: { expiry: sharing.get('expiry') ?? 'nobody' },
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      },
    }
  }

  // 3. A block in EITHER direction ends the conversation. Checked before
  //    discoverability so a blocked user cannot even confirm a card exists.
  if (relationship === 'blocked') return null

  // 4. A disabled owner disappears from everyone else's view.
  if (owner.status !== 'active') return null

  const isFriend = relationship === 'friends'

  // 5. Apply the owner's discovery setting.
  //    'nobody'  -> private, only branch 2 above can see it.
  //    'friends' -> strangers cannot even learn the card exists.
  //    'everyone'-> any signed-in, non-blocked user sees the safe subset,
  //                 which is what allows the find-then-befriend flow.
  if (card.discoverability === 'nobody') return null
  if (card.discoverability === 'friends' && !isFriend) return null

  // 6. Resolve field-level permissions. Each field is opt-in and is only
  //    decrypted once its own condition has passed.
  const shared: { expiry?: string; phone?: SharedPhoneDTO } = {}

  if (isFriend) {
    if (card.expiryCt !== null && sharing.get('expiry') === 'friends') {
      shared.expiry = deps.decryptExpiry(card.expiryCt)
    }

    if (owner.phoneVisibility === 'friends') {
      shared.phone = {
        e164: deps.decryptPhone(owner.phoneCt),
        masked: deps.maskPhone(owner.phoneCountryCode, owner.phoneLast4),
        verified: owner.phoneVerifiedAt !== null,
      }
    }
  }

  // 7. Assemble the safe DTO.
  return {
    kind: 'visitor',
    card: {
      ...buildSummary(card, bank, owner),
      access: {
        relationship,
        canViewSharedDetails: isFriend,
        // Only offer the button when a request can actually be created.
        // Pending in either direction, or an existing friendship, means no.
        canSendFriendRequest: relationship === 'none',
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
  /** Any block row between the two users, in either direction. */
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

  // A rejected request leaves no standing relationship. It is retained in
  // the database only so re-request throttling has something to read.
  return 'none'
}
