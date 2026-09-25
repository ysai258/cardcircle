import { describe, expect, it } from 'vitest'
import {
  listBanksWithCounts,
  listCardsByBank,
} from '@/server/modules/cards/service'
import {
  blockUserDirect,
  createTestBank,
  createTestCard,
  createTestUser,
  makeFriends,
} from '../helpers/factory'

/**
 * Discovery must never list — or count — a card the viewer cannot open.
 *
 * The count is tested as carefully as the list because a count computed from
 * a different predicate is its own disclosure: "HDFC Bank, 12 cards" next to
 * a page showing 9 tells the viewer three hidden cards exist.
 */

const FILTERS = { page: 1, pageSize: 20 } as const

describe('Private cards are excluded from discovery queries', () => {
  it('omits a private card from the listing and the count', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const bank = await createTestBank({ name: 'HDFC Bank', code: 'HDFC' })

    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Public Card',
      discoverability: 'everyone',
    })
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Private Card',
      discoverability: 'nobody',
    })

    const listing = await listCardsByBank(viewer.id, bank.id, FILTERS)
    expect(listing.items).toHaveLength(1)
    expect(listing.items[0]?.product.name).toBe('Public Card')
    expect(listing.total).toBe(1)

    const banks = await listBanksWithCounts(viewer.id)
    expect(banks.find((b) => b.id === bank.id)?.cardCount).toBe(1)
  })

  it('hides friends-only cards from strangers but shows them to friends', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser()
    const friend = await createTestUser()
    await makeFriends(owner.id, friend.id)

    const bank = await createTestBank()
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Friends Only Card',
      discoverability: 'friends',
    })

    const strangerListing = await listCardsByBank(stranger.id, bank.id, FILTERS)
    expect(strangerListing.items).toHaveLength(0)
    expect(strangerListing.total).toBe(0)
    expect(
      (await listBanksWithCounts(stranger.id)).find((b) => b.id === bank.id),
    ).toBeUndefined()

    const friendListing = await listCardsByBank(friend.id, bank.id, FILTERS)
    expect(friendListing.items).toHaveLength(1)
    expect(
      (await listBanksWithCounts(friend.id)).find((b) => b.id === bank.id)
        ?.cardCount,
    ).toBe(1)
  })
})

describe('Blocking removes cards from discovery in both directions', () => {
  it('hides the blocker from the blocked user and vice versa', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    await makeFriends(owner.id, viewer.id)

    const bank = await createTestBank()
    await createTestCard({ ownerId: owner.id, bankId: bank.id })
    await createTestCard({ ownerId: viewer.id, bankId: bank.id })

    // Visible before the block (each sees the other's one card).
    expect((await listCardsByBank(viewer.id, bank.id, FILTERS)).total).toBe(1)

    await blockUserDirect(owner.id, viewer.id)

    expect((await listCardsByBank(viewer.id, bank.id, FILTERS)).total).toBe(0)
    expect((await listCardsByBank(owner.id, bank.id, FILTERS)).total).toBe(0)
    expect(await listBanksWithCounts(viewer.id)).toHaveLength(0)
    expect(await listBanksWithCounts(owner.id)).toHaveLength(0)
  })
})

describe('Disabled accounts drop out of discovery', () => {
  it('excludes their cards from listings and counts', async () => {
    const owner = await createTestUser({ status: 'disabled' })
    const viewer = await createTestUser()
    const bank = await createTestBank()
    await createTestCard({ ownerId: owner.id, bankId: bank.id })

    expect((await listCardsByBank(viewer.id, bank.id, FILTERS)).total).toBe(0)
    expect(await listBanksWithCounts(viewer.id)).toHaveLength(0)
  })
})

describe('Listings never carry sensitive fields', () => {
  it('omits the phone, and the BIN when it is masked', async () => {
    const owner = await createTestUser({ phoneVisibility: 'friends' })
    const friend = await createTestUser()
    await makeFriends(owner.id, friend.id)

    const bank = await createTestBank()
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      bin: '540123',
      binVisibility: 'nobody',
    })

    const listing = await listCardsByBank(friend.id, bank.id, FILTERS)
    const json = JSON.stringify(listing)

    expect(listing.items).toHaveLength(1)
    expect(listing.items[0]?.bin).toBeUndefined()
    expect(json).not.toContain('540123')
    expect(json).not.toContain(owner.phone)
  })

  it('includes the BIN when the owner shares it with everyone', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const bank = await createTestBank()
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      bin: '540123',
      binVisibility: 'everyone',
    })

    const listing = await listCardsByBank(viewer.id, bank.id, FILTERS)
    expect(listing.items[0]?.bin).toBe('540123')
  })
})

describe('BIN search cannot be used as an oracle', () => {
  // Masking the BIN has to hide it from SEARCH as well as from display.
  // Otherwise anyone could guess six digits, see whose card matched, and
  // learn exactly the value the mask was hiding.
  it('does not find a card by a BIN the searcher may not see', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      bin: '540123',
      binVisibility: 'nobody',
    })

    // The card IS discoverable — it shows up unfiltered...
    expect(
      (await listCardsByBank(stranger.id, bank.id, FILTERS)).total,
    ).toBe(1)

    // ...but searching its exact BIN must not confirm that BIN.
    expect(
      (await listCardsByBank(stranger.id, bank.id, { ...FILTERS, bin: '540123' }))
        .total,
    ).toBe(0)
  })

  it('does not let a non-friend search a friends-only BIN', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser()
    const friend = await createTestUser()
    await makeFriends(owner.id, friend.id)

    const bank = await createTestBank()
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      bin: '540123',
      binVisibility: 'friends',
    })

    expect(
      (await listCardsByBank(stranger.id, bank.id, { ...FILTERS, bin: '5401' }))
        .total,
    ).toBe(0)

    // The friend, who may see it, can search it.
    expect(
      (await listCardsByBank(friend.id, bank.id, { ...FILTERS, bin: '5401' }))
        .total,
    ).toBe(1)
  })

  it('finds a card by BIN when the owner shares it with everyone', async () => {
    const owner = await createTestUser()
    const stranger = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      bin: '540123',
      binVisibility: 'everyone',
    })

    expect(
      (await listCardsByBank(stranger.id, bank.id, { ...FILTERS, bin: '5401' }))
        .total,
    ).toBe(1)
  })
})

describe('Filters and pagination', () => {
  it('filters by card type and network server-side', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Visa Credit Card',
      cardType: 'credit',
      network: 'visa',
    })
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'RuPay Debit Card',
      cardType: 'debit',
      network: 'rupay',
      bin: '607412',
    })

    const credit = await listCardsByBank(viewer.id, bank.id, {
      ...FILTERS,
      cardType: 'credit',
    })
    expect(credit.items.map((c) => c.product.name)).toEqual(['Visa Credit Card'])

    const rupay = await listCardsByBank(viewer.id, bank.id, {
      ...FILTERS,
      network: 'rupay',
    })
    expect(rupay.items.map((c) => c.product.name)).toEqual(['RuPay Debit Card'])
  })

  it('matches BIN by prefix', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Match Card',
      bin: '540123',
      binVisibility: 'everyone',
    })
    await createTestCard({
      ownerId: owner.id,
      bankId: bank.id,
      productName: 'Other Card',
      bin: '512345',
      binVisibility: 'everyone',
    })

    expect(
      (await listCardsByBank(viewer.id, bank.id, { ...FILTERS, bin: '5401' }))
        .items.map((c) => c.product.name),
    ).toEqual(['Match Card'])

    expect(
      (await listCardsByBank(viewer.id, bank.id, { ...FILTERS, bin: '540123' }))
        .items.map((c) => c.product.name),
    ).toEqual(['Match Card'])

    expect(
      (await listCardsByBank(viewer.id, bank.id, { ...FILTERS, bin: '9' }))
        .items,
    ).toHaveLength(0)
  })

  it('paginates without ever returning the whole inventory', async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const bank = await createTestBank()

    for (let i = 0; i < 25; i += 1) {
      await createTestCard({
        ownerId: owner.id,
        bankId: bank.id,
        productName: `Card ${String(i).padStart(2, '0')}`,
      })
    }

    const page1 = await listCardsByBank(viewer.id, bank.id, {
      page: 1,
      pageSize: 10,
    })
    expect(page1.items).toHaveLength(10)
    expect(page1.total).toBe(25)
    expect(page1.totalPages).toBe(3)

    const page3 = await listCardsByBank(viewer.id, bank.id, {
      page: 3,
      pageSize: 10,
    })
    expect(page3.items).toHaveLength(5)

    const ids = new Set([...page1.items, ...page3.items].map((c) => c.id))
    expect(ids.size).toBe(15)
  })
})

describe('Your own cards are not in discovery', () => {
  it('excludes them, since My Cards already covers them', async () => {
    const owner = await createTestUser()
    const bank = await createTestBank()
    await createTestCard({ ownerId: owner.id, bankId: bank.id })

    expect((await listCardsByBank(owner.id, bank.id, FILTERS)).total).toBe(0)
  })
})
