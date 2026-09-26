import { describe, expect, it } from 'vitest'
import { db } from '@/db'
import { cardProducts } from '@/db/schema'
import { productSlug } from '@/server/modules/cards/product-slug'
import { AppError } from '@/server/common/errors'
import { createCard, getOwnCard } from '@/server/modules/cards/service'
import { createTestBank, createTestUser } from '../helpers/factory'

/**
 * Member-supplied card links.
 *
 * The one place in this app where a member writes a URL that other members
 * will click. Frontend validation is worth nothing here — these assertions go
 * through the service, which is what a crafted request reaches.
 */

const CARD = {
  cardType: 'credit' as const,
  network: 'visa' as const,
  bin: '540123',
  binVisibility: 'friends' as const,
  discoverability: 'everyone' as const,
}

async function setup() {
  const owner = await createTestUser({ name: 'Rahul' })
  const bank = await createTestBank({ name: 'HDFC Bank', code: 'HDFC' })
  return { owner, bank }
}

describe('a link supplied with a new product', () => {
  it('is stored when it is on the bank’s own site', async () => {
    const { owner, bank } = await setup()

    const card = await createCard(owner.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
      otherProductUrl: 'https://www.hdfc.bank.in/credit-cards/pixel-play-credit-card',
    })

    expect(card.product.url).toBe(
      'https://www.hdfc.bank.in/credit-cards/pixel-play-credit-card',
    )
  })

  it('is refused when it points somewhere else', async () => {
    const { owner, bank } = await setup()

    const attempt = createCard(owner.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
      otherProductUrl: 'https://hdfc-bank-offers.example.com/claim',
    })

    await expect(attempt).rejects.toBeInstanceOf(AppError)
    await expect(attempt).rejects.toMatchObject({ status: 400 })
  })

  /**
   * The look-alike that matters most: a host ENDING in the bank's domain.
   * Anyone skimming the link sees the bank's name in it.
   */
  it('is refused for a host that merely ends with the bank’s domain', async () => {
    const { owner, bank } = await setup()

    await expect(
      createCard(owner.id, {
        ...CARD,
        bankId: bank.id,
        otherProductName: 'HDFC Pixel Play',
        otherProductUrl: 'https://www.hdfc.bank.in.example.com/credit-cards',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('is refused for another bank’s site', async () => {
    const { owner, bank } = await setup()

    await expect(
      createCard(owner.id, {
        ...CARD,
        bankId: bank.id,
        otherProductName: 'HDFC Pixel Play',
        otherProductUrl: 'https://www.icici.bank.in/personal-banking/cards',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('leaves the product with no link when none is given', async () => {
    const { owner, bank } = await setup()

    const card = await createCard(owner.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
    })

    expect(card.product.url).toBeNull()
  })
})

describe('a link on a product someone else already added', () => {
  it('fills a gap', async () => {
    const { owner, bank } = await setup()
    const second = await createTestUser({ name: 'Alice' })

    const first = await createCard(owner.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
    })
    expect(first.product.url).toBeNull()

    const added = await createCard(second.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
      otherProductUrl: 'https://www.hdfc.bank.in/credit-cards/pixel-play-credit-card',
    })

    expect(added.product.id).toBe(first.product.id)
    expect(added.product.url).toBe(
      'https://www.hdfc.bank.in/credit-cards/pixel-play-credit-card',
    )

    // And the first member's card now shows it too — one product, one link.
    const refreshed = await getOwnCard(owner.id, first.id)
    expect(refreshed.product.url).toBe(added.product.url)
  })

  /**
   * Adding a link is a contribution; changing one is a way to repoint a link
   * that everybody else already sees. The second is not allowed even though
   * the replacement would itself pass the host check.
   */
  it('cannot replace a link that is already there', async () => {
    const { owner, bank } = await setup()
    const second = await createTestUser({ name: 'Alice' })

    const original = 'https://www.hdfc.bank.in/credit-cards/pixel-play-credit-card'
    const first = await createCard(owner.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
      otherProductUrl: original,
    })

    const attempt = await createCard(second.id, {
      ...CARD,
      bankId: bank.id,
      otherProductName: 'HDFC Pixel Play',
      otherProductUrl: 'https://www.hdfc.bank.in/credit-cards/something-else',
    })

    expect(attempt.product.id).toBe(first.product.id)
    expect(attempt.product.url).toBe(original)
  })
})

describe('a bank whose hosts are unknown', () => {
  /**
   * A bank an operator added that bank-links.ts has never heard of has no
   * allowed hosts, so no link can be attached to its products. Failing
   * closed is the right direction: the alternative is accepting any URL for
   * any bank added later.
   */
  it('accepts no link at all', async () => {
    const owner = await createTestUser({ name: 'Rahul' })
    const bank = await createTestBank({ name: 'New Bank', code: 'NEWBANK' })

    await expect(
      createCard(owner.id, {
        ...CARD,
        bankId: bank.id,
        otherProductName: 'New Bank Rewards',
        otherProductUrl: 'https://www.newbank.example/cards/rewards',
      }),
    ).rejects.toBeInstanceOf(AppError)
  })
})

describe('the database’s own floor', () => {
  /**
   * The host allowlist needs the bank's code and so lives in the
   * application. `https:` does not, and a CHECK constraint is the thing that
   * still holds if a future code path forgets to validate: a stored
   * `javascript:` URL would be rendered into an href.
   */
  it('refuses a stored URL that is not https', async () => {
    const bank = await createTestBank({ name: 'HDFC Bank', code: 'HDFC' })

    const insert = (productUrl: string) =>
      db.insert(cardProducts).values({
        bankId: bank.id,
        cardType: 'credit',
        name: `Probe ${productUrl}`,
        slug: productSlug(`Probe ${productUrl}`),
        productUrl,
      })

    await expect(insert('javascript:alert(1)')).rejects.toThrow()
    await expect(insert('http://www.hdfc.bank.in/credit-cards')).rejects.toThrow()

    // And the value it is there to allow still goes in.
    await expect(
      insert('https://www.hdfc.bank.in/credit-cards'),
    ).resolves.toBeDefined()
  })
})
