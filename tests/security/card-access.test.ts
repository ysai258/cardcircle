import { describe, expect, it } from 'vitest'
import { findForbiddenKeys } from '@/server/common/redact'
import {
  deleteCard,
  getCardDetail,
  updateCard,
} from '@/server/modules/cards/service'
import {
  blockUserDirect,
  createTestBank,
  createTestCard,
  createTestUser,
  makeFriends,
  makePendingRequest,
} from '../helpers/factory'

/**
 * Authorisation, verified end-to-end against a real database.
 *
 * The unit suite proves the resolver's logic; this proves the wiring — that
 * the service actually consults it, with the relationship it really has.
 */

async function scenario(
  options: {
    expiry?: string | null
    expiryVisibility?: 'nobody' | 'friends'
    ownerPhoneVisibility?: 'nobody' | 'friends'
    discoverability?: 'nobody' | 'friends' | 'everyone'
  } = {},
) {
  const owner = await createTestUser({
    name: 'Rahul',
    phoneVisibility: options.ownerPhoneVisibility ?? 'nobody',
  })
  const viewer = await createTestUser({ name: 'Alice' })
  const bank = await createTestBank({ name: 'HDFC Bank', code: 'HDFC' })
  const card = await createTestCard({
    ownerId: owner.id,
    bankId: bank.id,
    expiry: options.expiry ?? '08/29',
    expiryVisibility: options.expiryVisibility ?? 'friends',
    discoverability: options.discoverability ?? 'everyone',
  })
  return { owner, viewer, bank, card }
}

describe('GET card detail — non-friend', () => {
  it('returns the safe subset and no shared fields', async () => {
    const { viewer, card } = await scenario()
    const view = await getCardDetail(viewer.id, card.id)

    expect(view.kind).toBe('visitor')
    if (view.kind !== 'visitor') throw new Error('unreachable')

    expect(view.card.bin).toBe('540123')
    expect(view.card.last4).toBe('1234')
    expect(view.card.owner.name).toBe('Rahul')
    expect(view.card.shared).toEqual({})
    expect(view.card.access.canSendFriendRequest).toBe(true)
  })

  it('does not return expiry even though the owner shares it with friends', async () => {
    const { viewer, card } = await scenario({ expiryVisibility: 'friends' })
    const view = await getCardDetail(viewer.id, card.id)

    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.expiry).toBeUndefined()
    expect(JSON.stringify(view)).not.toContain('08/29')
  })

  it('does not return the phone number even when shared with friends', async () => {
    const { viewer, card, owner } = await scenario({
      ownerPhoneVisibility: 'friends',
    })
    const view = await getCardDetail(viewer.id, card.id)

    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.phone).toBeUndefined()
    expect(JSON.stringify(view)).not.toContain(owner.phone)
  })
})

describe('GET card detail — friend', () => {
  it('returns expiry only when explicitly shared', async () => {
    const { owner, viewer, card } = await scenario({
      expiryVisibility: 'friends',
    })
    await makeFriends(owner.id, viewer.id)

    const view = await getCardDetail(viewer.id, card.id)
    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.expiry).toBe('08/29')
  })

  it('withholds expiry when the owner has not shared it', async () => {
    const { owner, viewer, card } = await scenario({
      expiryVisibility: 'nobody',
    })
    await makeFriends(owner.id, viewer.id)

    const view = await getCardDetail(viewer.id, card.id)
    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.expiry).toBeUndefined()
    expect(JSON.stringify(view)).not.toContain('08/29')
  })

  it('returns the phone number only when the owner opted in', async () => {
    const { owner, viewer, card } = await scenario({
      ownerPhoneVisibility: 'friends',
    })
    await makeFriends(owner.id, viewer.id)

    const view = await getCardDetail(viewer.id, card.id)
    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.phone?.e164).toBe(owner.phone)
    expect(view.card.shared.phone?.verified).toBe(false)
  })

  it('withholds the phone number when the owner did not opt in', async () => {
    const { owner, viewer, card } = await scenario({
      ownerPhoneVisibility: 'nobody',
    })
    await makeFriends(owner.id, viewer.id)

    const view = await getCardDetail(viewer.id, card.id)
    if (view.kind !== 'visitor') throw new Error('unreachable')
    expect(view.card.shared.phone).toBeUndefined()
    expect(JSON.stringify(view)).not.toContain(owner.phone)
  })
})

describe('Card ids cannot be used to bypass authorisation', () => {
  it('denies a blocked user who knows the card id', async () => {
    const { owner, viewer, card } = await scenario()
    await makeFriends(owner.id, viewer.id)
    await blockUserDirect(owner.id, viewer.id)

    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('denies the blocker as well as the blocked', async () => {
    const { owner, viewer, card } = await scenario()
    await blockUserDirect(viewer.id, owner.id)

    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('denies access to a private card held by a friend', async () => {
    const { owner, viewer, card } = await scenario({
      discoverability: 'nobody',
    })
    await makeFriends(owner.id, viewer.id)

    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('denies a stranger a friends-only card', async () => {
    const { viewer, card } = await scenario({ discoverability: 'friends' })
    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('denies someone with only a pending request', async () => {
    const { owner, viewer, card } = await scenario({
      discoverability: 'friends',
    })
    await makePendingRequest(viewer.id, owner.id)

    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('hides cards owned by a disabled account', async () => {
    const owner = await createTestUser({ status: 'disabled' })
    const viewer = await createTestUser()
    const bank = await createTestBank()
    const card = await createTestCard({ ownerId: owner.id, bankId: bank.id })
    await makeFriends(owner.id, viewer.id)

    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })
})

describe('Ownership', () => {
  it('does not let a user edit another user\'s card', async () => {
    const { viewer, card } = await scenario()

    await expect(
      updateCard(viewer.id, card.id, { nickname: 'Hijacked' }),
    ).rejects.toThrow(/not found/i)
  })

  it('does not let a friend edit the card either', async () => {
    const { owner, viewer, card } = await scenario()
    await makeFriends(owner.id, viewer.id)

    await expect(
      updateCard(viewer.id, card.id, { nickname: 'Hijacked' }),
    ).rejects.toThrow(/not found/i)
  })

  it('does not let a user delete another user\'s card', async () => {
    const { viewer, card } = await scenario()
    await expect(deleteCard(viewer.id, card.id)).rejects.toThrow(/not found/i)

    // And the card survives.
    const view = await getCardDetail(viewer.id, card.id)
    expect(view.kind).toBe('visitor')
  })
})

describe('No response ever carries a forbidden field', () => {
  it('holds for owner, friend and stranger views alike', async () => {
    const { owner, viewer, card } = await scenario({
      expiryVisibility: 'friends',
      ownerPhoneVisibility: 'friends',
    })

    const strangerView = await getCardDetail(viewer.id, card.id)
    expect(findForbiddenKeys(strangerView)).toEqual([])

    await makeFriends(owner.id, viewer.id)
    const friendView = await getCardDetail(viewer.id, card.id)
    expect(findForbiddenKeys(friendView)).toEqual([])

    const ownerView = await getCardDetail(owner.id, card.id)
    expect(findForbiddenKeys(ownerView)).toEqual([])
    expect(ownerView.kind).toBe('owner')
  })

  it('never serialises the raw database row', async () => {
    const { owner, card } = await scenario()
    const view = await getCardDetail(owner.id, card.id)
    const json = JSON.stringify(view)

    for (const column of [
      'expiryCt',
      'expiry_ct',
      'phoneCt',
      'phone_ct',
      'phoneHmac',
      'phone_hmac',
      'passwordHash',
      'password_hash',
      'ownerId',
    ]) {
      expect(json).not.toContain(column)
    }
  })
})
