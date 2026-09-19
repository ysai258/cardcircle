import { describe, expect, it } from 'vitest'
import type { CardField, Visibility } from '@/db/schema'
import {
  buildCardView,
  resolveRelationship,
} from '@/server/modules/cards/authorization'
import type { Relationship } from '@/server/modules/cards/dto'
import { findForbiddenKeys } from '@/server/common/redact'
import {
  DECRYPTED_EXPIRY,
  DECRYPTED_PHONE,
  deps,
  explodingDeps,
  HDFC,
  makeCard,
  makeOwner,
} from '../helpers/card-fixtures'

const REQUESTER = 'user-alice'

function sharing(expiry: Visibility): ReadonlyMap<CardField, Visibility> {
  return new Map<CardField, Visibility>([['expiry', expiry]])
}

const NO_SHARING = new Map<CardField, Visibility>()

function view(overrides: {
  relationship: Relationship
  requesterId?: string | null
  expirySharing?: Visibility
  phoneVisibility?: Visibility
  discoverability?: 'nobody' | 'friends' | 'everyone'
  ownerStatus?: 'active' | 'disabled'
  hasExpiry?: boolean
  customDeps?: typeof deps
}) {
  return buildCardView(
    {
      requesterId:
        overrides.requesterId === undefined ? REQUESTER : overrides.requesterId,
      card: makeCard({
        discoverability: overrides.discoverability ?? 'everyone',
        expiryCt:
          overrides.hasExpiry === false ? null : Buffer.from('encrypted'),
      }),
      bank: HDFC,
      owner: makeOwner({
        phoneVisibility: overrides.phoneVisibility ?? 'nobody',
        status: overrides.ownerStatus ?? 'active',
      }),
      relationship: overrides.relationship,
      sharing: overrides.expirySharing
        ? sharing(overrides.expirySharing)
        : NO_SHARING,
    },
    overrides.customDeps ?? deps,
  )
}

// ---------------------------------------------------------------------------
// The core security properties
// ---------------------------------------------------------------------------

describe('buildCardView — access', () => {
  it('denies unauthenticated requesters', () => {
    expect(view({ relationship: 'none', requesterId: null })).toBeNull()
  })

  it('denies blocked users even when the card is discoverable', () => {
    expect(view({ relationship: 'blocked' })).toBeNull()
  })

  it('denies blocked users who were previously friends with shared fields', () => {
    expect(
      view({
        relationship: 'blocked',
        expirySharing: 'friends',
        phoneVisibility: 'friends',
      }),
    ).toBeNull()
  })

  it('hides a private card from a friend', () => {
    expect(
      view({
        relationship: 'friends',
        discoverability: 'nobody',
        expirySharing: 'friends',
      }),
    ).toBeNull()
  })

  it('hides a private card from a stranger', () => {
    expect(view({ relationship: 'none', discoverability: 'nobody' })).toBeNull()
  })

  it('hides a friends-only card from a stranger', () => {
    expect(view({ relationship: 'none', discoverability: 'friends' })).toBeNull()
  })

  it('hides a friends-only card from someone with a pending request', () => {
    expect(
      view({ relationship: 'request_sent', discoverability: 'friends' }),
    ).toBeNull()
  })

  it('shows a friends-only card to an accepted friend', () => {
    const result = view({ relationship: 'friends', discoverability: 'friends' })
    expect(result?.kind).toBe('visitor')
  })

  it('shows an everyone card to a stranger, so they can request friendship', () => {
    const result = view({ relationship: 'none', discoverability: 'everyone' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')
    expect(result.card.access.canSendFriendRequest).toBe(true)
    expect(result.card.shared).toEqual({})
  })

  it('hides cards belonging to a disabled owner', () => {
    expect(
      view({ relationship: 'friends', ownerStatus: 'disabled' }),
    ).toBeNull()
  })

  it('still shows the owner their own card when it is not discoverable', () => {
    const result = view({ relationship: 'self', discoverability: 'nobody' })
    expect(result?.kind).toBe('owner')
  })

  it('still shows the owner their own card when their account is disabled', () => {
    const result = view({ relationship: 'self', ownerStatus: 'disabled' })
    expect(result?.kind).toBe('owner')
  })
})

describe('buildCardView — field-level sharing', () => {
  it('gives a non-friend no shared fields at all', () => {
    const result = view({
      relationship: 'none',
      expirySharing: 'friends',
      phoneVisibility: 'friends',
    })

    expect(result?.kind).toBe('visitor')
    if (result?.kind !== 'visitor') throw new Error('unreachable')
    expect(result.card.shared).toEqual({})
    expect(result.card.access.canViewSharedDetails).toBe(false)
  })

  it('withholds expiry from a friend when it is not shared', () => {
    const result = view({ relationship: 'friends', expirySharing: 'nobody' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.expiry).toBeUndefined()
    expect('expiry' in result.card.shared).toBe(false)
  })

  it('releases expiry to a friend when explicitly shared', () => {
    const result = view({ relationship: 'friends', expirySharing: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.expiry).toBe(DECRYPTED_EXPIRY)
  })

  it('omits expiry when shared but the owner recorded none', () => {
    const result = view({
      relationship: 'friends',
      expirySharing: 'friends',
      hasExpiry: false,
    })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect('expiry' in result.card.shared).toBe(false)
  })

  it('withholds phone from a friend by default', () => {
    const result = view({ relationship: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.phone).toBeUndefined()
  })

  it('releases phone to a friend when visibility is friends', () => {
    const result = view({
      relationship: 'friends',
      phoneVisibility: 'friends',
    })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.phone).toEqual({
      e164: DECRYPTED_PHONE,
      masked: '+91 ••••••3210',
      verified: false,
    })
  })

  it('marks the phone unverified, because v1 has no verification', () => {
    const result = view({
      relationship: 'friends',
      phoneVisibility: 'friends',
    })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.phone?.verified).toBe(false)
  })

  it('shares expiry and phone independently', () => {
    const result = view({
      relationship: 'friends',
      expirySharing: 'friends',
      phoneVisibility: 'nobody',
    })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.expiry).toBe(DECRYPTED_EXPIRY)
    expect(result.card.shared.phone).toBeUndefined()
  })
})

describe('buildCardView — does not decrypt what it will not release', () => {
  // If these pass with deps that throw, the resolver provably never touched
  // the ciphertext on an unauthorised branch.
  const unauthorized: Relationship[] = [
    'none',
    'request_sent',
    'request_received',
    'blocked',
  ]

  for (const relationship of unauthorized) {
    it(`never decrypts for relationship "${relationship}"`, () => {
      expect(() =>
        view({
          relationship,
          expirySharing: 'friends',
          phoneVisibility: 'friends',
          customDeps: explodingDeps,
        }),
      ).not.toThrow()
    })
  }

  it('never decrypts for a friend when nothing is shared', () => {
    expect(() =>
      view({
        relationship: 'friends',
        expirySharing: 'nobody',
        phoneVisibility: 'nobody',
        customDeps: explodingDeps,
      }),
    ).not.toThrow()
  })
})

describe('buildCardView — response contains no forbidden fields', () => {
  const relationships: Relationship[] = [
    'self',
    'friends',
    'request_sent',
    'request_received',
    'none',
  ]

  for (const relationship of relationships) {
    it(`emits no forbidden key for relationship "${relationship}"`, () => {
      const result = view({
        relationship,
        expirySharing: 'friends',
        phoneVisibility: 'friends',
      })

      expect(findForbiddenKeys(result)).toEqual([])
    })
  }

  it('never emits the raw ciphertext columns', () => {
    const result = view({ relationship: 'self' })
    const json = JSON.stringify(result)

    expect(json).not.toContain('expiryCt')
    expect(json).not.toContain('phoneCt')
    expect(json).not.toContain('phoneHmac')
    expect(json).not.toContain('passwordHash')
  })
})

describe('buildCardView — friend request affordance', () => {
  it('offers a friend request only when there is no standing relationship', () => {
    const cases: Array<[Relationship, boolean]> = [
      ['none', true],
      ['request_sent', false],
      ['request_received', false],
      ['friends', false],
    ]

    for (const [relationship, expected] of cases) {
      const result = view({ relationship })
      if (result?.kind !== 'visitor') throw new Error('expected visitor view')
      expect(result.card.access.canSendFriendRequest).toBe(expected)
    }
  })
})

// ---------------------------------------------------------------------------
// resolveRelationship
// ---------------------------------------------------------------------------

describe('resolveRelationship', () => {
  const base = { requesterId: 'a', ownerId: 'b', blockExists: false }

  it('detects self', () => {
    expect(
      resolveRelationship({ ...base, ownerId: 'a', friendship: null }),
    ).toBe('self')
  })

  it('reports blocked regardless of an accepted friendship', () => {
    expect(
      resolveRelationship({
        ...base,
        blockExists: true,
        friendship: { requesterId: 'a', recipientId: 'b', status: 'accepted' },
      }),
    ).toBe('blocked')
  })

  it('reports none when there is no row', () => {
    expect(resolveRelationship({ ...base, friendship: null })).toBe('none')
  })

  it('distinguishes the direction of a pending request', () => {
    expect(
      resolveRelationship({
        ...base,
        friendship: { requesterId: 'a', recipientId: 'b', status: 'pending' },
      }),
    ).toBe('request_sent')

    expect(
      resolveRelationship({
        ...base,
        friendship: { requesterId: 'b', recipientId: 'a', status: 'pending' },
      }),
    ).toBe('request_received')
  })

  it('treats a rejected request as no relationship', () => {
    expect(
      resolveRelationship({
        ...base,
        friendship: { requesterId: 'a', recipientId: 'b', status: 'rejected' },
      }),
    ).toBe('none')
  })

  it('reports friends for an accepted request in either direction', () => {
    expect(
      resolveRelationship({
        ...base,
        friendship: { requesterId: 'b', recipientId: 'a', status: 'accepted' },
      }),
    ).toBe('friends')
  })
})
