import { describe, expect, it } from 'vitest'
import type { Discoverability, FieldVisibility } from '@/db/schema'
import {
  buildCardView,
  canSeeBin,
  resolveRelationship,
} from '@/server/modules/cards/authorization'
import type { Relationship } from '@/server/modules/cards/dto'
import { findForbiddenKeys } from '@/server/common/redact'
import {
  DECRYPTED_PHONE,
  deps,
  explodingDeps,
  HDFC,
  MILLENNIA,
  makeCard,
  makeOwner,
} from '../helpers/card-fixtures'

const REQUESTER = 'user-alice'

function view(overrides: {
  relationship: Relationship
  requesterId?: string | null
  binVisibility?: FieldVisibility
  phoneVisibility?: 'nobody' | 'friends'
  discoverability?: Discoverability
  ownerStatus?: 'active' | 'disabled'
  customDeps?: typeof deps
}) {
  return buildCardView(
    {
      requesterId:
        overrides.requesterId === undefined ? REQUESTER : overrides.requesterId,
      card: makeCard({
        discoverability: overrides.discoverability ?? 'everyone',
        binVisibility: overrides.binVisibility ?? 'friends',
      }),
      bank: HDFC,
      product: MILLENNIA,
      cardType: 'credit',
      owner: makeOwner({
        phoneVisibility: overrides.phoneVisibility ?? 'nobody',
        status: overrides.ownerStatus ?? 'active',
      }),
      relationship: overrides.relationship,
    },
    overrides.customDeps ?? deps,
  )
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

describe('buildCardView — access', () => {
  it('denies unauthenticated requesters', () => {
    expect(view({ relationship: 'none', requesterId: null })).toBeNull()
  })

  it('denies blocked users even when the card is discoverable', () => {
    expect(view({ relationship: 'blocked' })).toBeNull()
  })

  it('denies blocked users who were previously friends', () => {
    expect(
      view({
        relationship: 'blocked',
        binVisibility: 'everyone',
        phoneVisibility: 'friends',
      }),
    ).toBeNull()
  })

  it('hides a private card from a friend', () => {
    expect(
      view({ relationship: 'friends', discoverability: 'nobody' }),
    ).toBeNull()
  })

  it('hides a friends-only card from a stranger', () => {
    expect(view({ relationship: 'none', discoverability: 'friends' })).toBeNull()
  })

  it('hides a friends-only card from someone with a pending request', () => {
    expect(
      view({ relationship: 'request_sent', discoverability: 'friends' }),
    ).toBeNull()
  })

  it('hides cards belonging to a disabled owner', () => {
    expect(view({ relationship: 'friends', ownerStatus: 'disabled' })).toBeNull()
  })

  it('still shows the owner their own private card', () => {
    expect(view({ relationship: 'self', discoverability: 'nobody' })?.kind).toBe(
      'owner',
    )
  })
})

// ---------------------------------------------------------------------------
// BIN masking — the new field-level control
// ---------------------------------------------------------------------------

describe('canSeeBin', () => {
  const cases: Array<[FieldVisibility, Relationship, boolean]> = [
    ['everyone', 'none', true],
    ['everyone', 'friends', true],
    ['everyone', 'request_sent', true],
    ['everyone', 'blocked', false],
    ['friends', 'friends', true],
    ['friends', 'none', false],
    ['friends', 'request_sent', false],
    ['friends', 'request_received', false],
    ['friends', 'blocked', false],
    ['nobody', 'friends', false],
    ['nobody', 'none', false],
    ['nobody', 'blocked', false],
    // The owner always sees their own digits, whatever the setting.
    ['nobody', 'self', true],
    ['friends', 'self', true],
  ]

  for (const [visibility, relationship, expected] of cases) {
    it(`${visibility} + ${relationship} -> ${expected}`, () => {
      expect(canSeeBin(visibility, relationship)).toBe(expected)
    })
  }
})

describe('buildCardView — BIN masking', () => {
  it('omits the BIN key entirely when masked, rather than blanking it', () => {
    const result = view({ relationship: 'none', binVisibility: 'nobody' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    // Absence, not masking: there is no key to un-blank client-side.
    expect('bin' in result.card).toBe(false)
    expect(result.card.access.binVisible).toBe(false)
    expect(JSON.stringify(result)).not.toContain('540123')
  })

  it('releases the BIN to a friend when set to friends', () => {
    const result = view({ relationship: 'friends', binVisibility: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.bin).toBe('540123')
    expect(result.card.access.binVisible).toBe(true)
  })

  it('withholds the BIN from a stranger when set to friends', () => {
    const result = view({ relationship: 'none', binVisibility: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.bin).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain('540123')
  })

  it('releases the BIN to a stranger when set to everyone', () => {
    const result = view({ relationship: 'none', binVisibility: 'everyone' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.bin).toBe('540123')
  })

  it('still names the product when the BIN is masked', () => {
    // The point of masking: "Rahul has an HDFC Millennia" stays answerable
    // without publishing any digits.
    const result = view({ relationship: 'none', binVisibility: 'nobody' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.product.name).toBe('HDFC Millennia')
    expect(result.card.network).toBe('visa')
    expect(result.card.cardType).toBe('credit')
  })

  it('always shows the owner their own BIN', () => {
    const result = view({ relationship: 'self', binVisibility: 'nobody' })
    if (result?.kind !== 'owner') throw new Error('expected owner view')

    expect(result.card.bin).toBe('540123')
    expect(result.card.binVisibility).toBe('nobody')
  })
})

// ---------------------------------------------------------------------------
// Phone sharing
// ---------------------------------------------------------------------------

describe('buildCardView — phone sharing', () => {
  it('gives a non-friend no shared fields at all', () => {
    const result = view({ relationship: 'none', phoneVisibility: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared).toEqual({})
  })

  it('releases the phone to a friend who was opted in', () => {
    const result = view({ relationship: 'friends', phoneVisibility: 'friends' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.phone?.e164).toBe(DECRYPTED_PHONE)
    expect(result.card.shared.phone?.verified).toBe(false)
  })

  it('withholds the phone from a friend who was not opted in', () => {
    const result = view({ relationship: 'friends', phoneVisibility: 'nobody' })
    if (result?.kind !== 'visitor') throw new Error('expected visitor view')

    expect(result.card.shared.phone).toBeUndefined()
  })
})

describe('buildCardView — does not decrypt what it will not release', () => {
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
          phoneVisibility: 'friends',
          binVisibility: 'everyone',
          customDeps: explodingDeps,
        }),
      ).not.toThrow()
    })
  }

  it('never decrypts for a friend when the phone is not shared', () => {
    expect(() =>
      view({
        relationship: 'friends',
        phoneVisibility: 'nobody',
        customDeps: explodingDeps,
      }),
    ).not.toThrow()
  })
})

describe('buildCardView — no forbidden fields, and none that were removed', () => {
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
        binVisibility: 'everyone',
        phoneVisibility: 'friends',
      })
      expect(findForbiddenKeys(result)).toEqual([])
    })
  }

  it('carries no last4 or expiry, because those columns no longer exist', () => {
    const json = JSON.stringify(view({ relationship: 'self' }))

    expect(json).not.toContain('last4')
    expect(json).not.toContain('expiry')
    expect(json).not.toContain('nickname')
  })
})

describe('buildCardView — friend request affordance', () => {
  it('offers a request only when there is no standing relationship', () => {
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

describe('resolveRelationship', () => {
  const base = { requesterId: 'a', ownerId: 'b', blockExists: false }

  it('detects self', () => {
    expect(resolveRelationship({ ...base, ownerId: 'a', friendship: null })).toBe(
      'self',
    )
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
