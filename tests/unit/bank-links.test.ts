import { describe, expect, it } from 'vitest'
import { CARD_PRODUCT_URLS } from '@/db/card-product-urls'
import { CARD_PRODUCTS } from '@/db/card-products'
import {
  allCardPageUrls,
  bankCardsPage,
  cardLink,
  isAllowedCardUrl,
  linkHost,
} from '@/lib/bank-links'

/**
 * Card links are outbound links CardCircle puts in front of its members, and
 * one of them is supplied by another member. So the interesting assertions
 * here are not "does the helper work" but "can a link that is not the bank's
 * ever be stored and shown".
 */

describe('isAllowedCardUrl', () => {
  it('accepts the bank’s own hosts, new and old', () => {
    expect(isAllowedCardUrl('HDFC', 'https://www.hdfc.bank.in/credit-cards')).toBe(true)
    expect(isAllowedCardUrl('HDFC', 'https://www.hdfcbank.com/anything')).toBe(true)
    // SBI's credit cards live on a separate business's domain.
    expect(isAllowedCardUrl('SBI', 'https://www.sbicard.com/en/personal/credit-cards.html')).toBe(true)
  })

  it('accepts a subdomain but not a look-alike suffix', () => {
    expect(isAllowedCardUrl('PNB', 'https://creditcard.pnb.bank.in/')).toBe(true)
    // The whole point of matching on a dot boundary: this is someone else's
    // domain that merely ENDS with the bank's name.
    expect(isAllowedCardUrl('HDFC', 'https://hdfc.bank.in.example.com/login')).toBe(false)
    expect(isAllowedCardUrl('HDFC', 'https://nothdfc.bank.in/login')).toBe(false)
  })

  it('rejects another bank’s host', () => {
    expect(isAllowedCardUrl('HDFC', 'https://www.icici.bank.in/anything')).toBe(false)
  })

  it('rejects anything that is not https', () => {
    expect(isAllowedCardUrl('HDFC', 'http://www.hdfc.bank.in/credit-cards')).toBe(false)
    expect(isAllowedCardUrl('HDFC', 'javascript:alert(1)')).toBe(false)
    expect(isAllowedCardUrl('HDFC', 'data:text/html,<h1>bank</h1>')).toBe(false)
    expect(isAllowedCardUrl('HDFC', 'not a url at all')).toBe(false)
    expect(isAllowedCardUrl('HDFC', '')).toBe(false)
  })

  it('rejects credentials smuggled into the authority', () => {
    // Reads as hdfc.bank.in to a person skimming it; goes to evil.example.
    expect(
      isAllowedCardUrl('HDFC', 'https://www.hdfc.bank.in@evil.example/login'),
    ).toBe(false)
  })

  it('allows the fintech partners that market bank-issued cards', () => {
    expect(
      isAllowedCardUrl('CSB', 'https://jupiter.money/edge-plus-upi-rupay-credit-card'),
    ).toBe(true)
    expect(isAllowedCardUrl('CSB', 'https://jupiter.money.evil.example/x')).toBe(false)
  })

  it('rejects everything for a bank code it has never heard of', () => {
    expect(isAllowedCardUrl('NOSUCHBANK', 'https://www.hdfc.bank.in/x')).toBe(false)
  })
})

describe('cardLink', () => {
  it('prefers the product page', () => {
    const link = cardLink(
      'HDFC',
      'credit',
      'https://www.hdfc.bank.in/credit-cards/freedom-credit-card',
    )
    expect(link).toEqual({
      url: 'https://www.hdfc.bank.in/credit-cards/freedom-credit-card',
      exact: true,
    })
  })

  it('falls back to the bank’s card list, and says so', () => {
    const link = cardLink('HDFC', 'debit', null)
    expect(link?.exact).toBe(false)
    expect(link?.url).toBe(bankCardsPage('HDFC', 'debit'))
  })

  /**
   * The check runs again at render time, not only on the way in. A row
   * written before a host was removed from the allowlist must stop being
   * rendered, rather than being trusted because it is already stored.
   */
  it('ignores a stored URL that is not on the bank’s hosts', () => {
    const link = cardLink('HDFC', 'credit', 'https://evil.example/hdfc-freedom')
    expect(link?.exact).toBe(false)
    expect(link?.url).toBe(bankCardsPage('HDFC', 'credit'))
  })

  it('returns null when there is nothing honest to link to', () => {
    // Citi's Indian card pages are gone, so it has no card list on file.
    expect(cardLink('CITI', 'credit', null)).toBeNull()
  })
})

describe('the shipped card pages', () => {
  it('are all https and on their own bank’s hosts', () => {
    for (const { bank, url } of allCardPageUrls()) {
      expect(isAllowedCardUrl(bank, url), `${bank} ${url}`).toBe(true)
    }
  })

  it('point at a real path, not just a bank’s front page', () => {
    for (const { bank, url } of allCardPageUrls()) {
      // Two exceptions are card portals that ARE the whole site.
      if (['PNB', 'BANDHAN'].includes(bank)) continue
      expect(new URL(url).pathname, `${bank} ${url}`).not.toBe('/')
    }
  })
})

describe('the shipped product URLs', () => {
  it('are all https and on their own bank’s hosts', () => {
    for (const [bank, , name, url] of CARD_PRODUCT_URLS) {
      expect(isAllowedCardUrl(bank, url), `${bank} ${name} ${url}`).toBe(true)
    }
  })

  /**
   * A URL is joined to its product by name at migration time. A name that
   * does not exist in the catalogue silently matches no row, which is the
   * failure mode that made an earlier merge migration a no-op.
   */
  it('name products that exist in the catalogue', () => {
    const known = new Set<string>()
    for (const seed of CARD_PRODUCTS) {
      for (const name of seed.credit) known.add(`${seed.bank}:credit:${name}`)
      for (const name of seed.debit) known.add(`${seed.bank}:debit:${name}`)
    }

    for (const [bank, cardType, name] of CARD_PRODUCT_URLS) {
      expect(known.has(`${bank}:${cardType}:${name}`), `${bank} ${name}`).toBe(true)
    }
  })

  /**
   * These banks' entries were taken wholesale from the issuer rather than
   * recalled, so every one of them should carry a link. The exceptions are
   * listed here one by one, because each is a decision and not an oversight
   * — and because adding a card to one of these banks without a link should
   * fail this test rather than pass unnoticed.
   */
  const EXPECTED_WITHOUT_LINKS: Record<string, string[]> = {
    // Kept alive only because a member's card points at it. Goes when they
    // re-pick, and this line goes with it.
    CANARA: ['debit:Canara RuPay Debit'],
    UNION: [],
    BANDHAN: [],
    // HSBC India publishes no debit-card pages; these two names are older
    // than this rebuild and could not be checked either way.
    HSBC: ['debit:HSBC Premier Debit', 'debit:HSBC Advance Debit'],
    // Same for PNB: its debit cards have no page of their own.
    PNB: ['debit:PNB Classic Debit', 'debit:PNB RuPay Debit'],
    BOB: [],
    // AU shows four cards with no page of their own.
    AUSFB: [
      'credit:AU Xcite',
      'credit:AU Xcite Ultra',
      'credit:AU Xcite Ace',
      'credit:AU InstaPay',
    ],
    IDBI: [],
    // DBS publishes no debit-card pages; these three names predate the
    // rebuild and could not be checked either way.
    DBS: ['debit:DBS digibank Debit', 'debit:DBS Visa Debit', 'debit:DBS Treasures Debit'],
    // Two co-brands Federal does not list on its own card pages.
    FEDERAL: [
      'credit:Scapia Federal',
      'credit:Edge Federal Bank VISA Credit Card (Jupiter)',
    ],
    // CSB's debit pages sit behind a bot wall that real Chrome does not get
    // past either, and OneCard is marketed on onecard.app rather than by CSB.
    CSB: [
      'credit:CSB OneCard',
      'debit:CSB Classic Debit',
      'debit:CSB Platinum Debit',
      'debit:CSB RuPay Debit',
    ],
    // Real cards whose tile on YES Bank's page leads to a generic
    // application form rather than a page about that card. A link to an
    // apply form is not a link to the card.
    YES: [
      // Stayed as "YES Marquee"; YES Bank prints "MARQUEE Credit Card" and
      // the two are one card, matched on slug rather than name.
      'credit:YES Marquee',
      'credit:YES RESERV',
      'credit:YES Elite+',
      'credit:YES ACE',
      'credit:YES Select',
      'credit:YES RuPay',
      'credit:YES Paisabazaar PaisaSave RuPay',
      'credit:YES BYOC',
      'credit:YES Wellness',
      'credit:YES Wellness Plus',
      'credit:YES EMI Card',
      "credit:YES Essence Women's",
      'debit:YES Private Debit',
    ],
    // Central lists its debit cards as text on one page, with no page per
    // card, so the names are real and the links do not exist. Its credit
    // page has no card list at all — those three names are untouched.
    CENTRAL: [
      'credit:Central Bank RuPay Platinum',
      'credit:Central Bank Aspire',
      'credit:Central Bank Classic',
      'debit:Central Bank RuPay Select Wellness Debit',
      'debit:Central Bank RuPay Platinum Debit',
      'debit:Central Bank RuPay Classic Debit',
      'debit:Central Bank Business Debit',
      'debit:Central Bank Visa Platinum Debit',
    ],
  }

  it.each(Object.keys(EXPECTED_WITHOUT_LINKS))(
    'cover every %s product except the ones named here',
    (bank) => {
      const linked = new Set(
        CARD_PRODUCT_URLS.filter(([code]) => code === bank).map(
          ([, cardType, name]) => `${cardType}:${name}`,
        ),
      )
      const seed = CARD_PRODUCTS.find((entry) => entry.bank === bank)
      const missing = [
        ...seed!.credit.map((name) => `credit:${name}`),
        ...seed!.debit.map((name) => `debit:${name}`),
      ].filter((key) => !linked.has(key))

      expect(missing.sort()).toEqual([...EXPECTED_WITHOUT_LINKS[bank]].sort())
    },
  )

  it('give each product at most one URL', () => {
    const seen = new Set<string>()
    for (const [bank, cardType, name] of CARD_PRODUCT_URLS) {
      const key = `${bank}:${cardType}:${name}`
      expect(seen.has(key), `duplicate: ${key}`).toBe(false)
      seen.add(key)
    }
  })
})

describe('linkHost', () => {
  it('drops the www so the domain is what people read', () => {
    expect(linkHost('https://www.hdfc.bank.in/credit-cards')).toBe('hdfc.bank.in')
    expect(linkHost('https://sbi.bank.in/x')).toBe('sbi.bank.in')
    expect(linkHost('nonsense')).toBe('')
  })
})
