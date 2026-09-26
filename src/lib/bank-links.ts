/**
 * Links out to the issuer's own pages.
 *
 * A card's name is the question "what does this card actually get me?". The
 * answer is offers, fee waivers and reward rates, all of which change
 * constantly and none of which CardCircle knows. So the name links to the
 * issuer's page instead of pretending to answer.
 *
 * Two levels, and the difference matters to the person clicking:
 *
 *   - the PRODUCT page, e.g. hdfc.bank.in/credit-cards/freedom-credit-card,
 *     stored per product in the database (see db/card-product-urls.ts);
 *   - this file's CARD PAGE, the bank's own list of cards, used when no
 *     product page is on file. It is the honest fallback: "here is where
 *     this bank publishes its cards", not "here is your exact card".
 *
 * WHY THE HOSTS ARE AN ALLOWLIST
 *
 * A member adding a card may supply the link for it, and that link is then
 * shown to their friends — who will click it partly because CardCircle
 * displayed it. An arbitrary URL there would make this app a delivery
 * channel for a phishing page dressed as a bank. So a card link must point
 * at a host that belongs to the bank that issued the card, and anything else
 * is rejected at the API, not hidden in the UI.
 *
 * WHY .bank.in
 *
 * Indian banks moved their public sites onto the RBI-administered `bank.in`
 * zone, so hdfcbank.com now redirects to hdfc.bank.in and so on. Both are
 * listed: the old domains still resolve, and a link saved earlier should
 * keep working.
 */

export type CardType = 'credit' | 'debit'

/**
 * Hosts that may appear in a card link, per bank.
 *
 * A match is the exact host or a subdomain of it, never a suffix: that
 * distinction is what stops `hdfc.bank.in.example.com` passing.
 */
const BANK_HOSTS: Record<string, readonly string[]> = {
  HDFC: ['hdfc.bank.in', 'hdfcbank.com'],
  ICICI: ['icici.bank.in', 'icicibank.com'],
  AXIS: ['axis.bank.in', 'axisbank.com'],
  KOTAK: ['kotak.bank.in', 'kotak.com'],
  // SBI splits its cards across two businesses: credit cards are SBI Card's,
  // debit cards are the bank's.
  SBI: ['sbi.bank.in', 'sbicard.com', 'sbi.co.in', 'bank.sbi'],
  AMEX: ['americanexpress.com'],
  IDFC: ['idfcfirst.bank.in', 'idfcfirstbank.com'],
  CANARA: ['canarabank.bank.in', 'canarabank.com'],
  UNION: ['unionbankofindia.bank.in', 'unionbankofindia.co.in'],
  RBL: ['rbl.bank.in', 'rblbank.com'],
  INDUSIND: ['indusind.bank.in', 'indusind.com'],
  YES: ['yes.bank.in', 'yesbank.in'],
  // BoB issues its credit cards through BOBCARD, a subsidiary its own card
  // pages link to.
  BOB: ['bankofbaroda.bank.in', 'bankofbaroda.in', 'bobcard.co.in', 'bobfinancial.com'],
  PNB: ['pnb.bank.in', 'pnbindia.in'],
  IDBI: ['idbi.bank.in', 'idbibank.in'],
  FEDERAL: ['federal.bank.in', 'federalbank.co.in'],
  BOI: ['bankofindia.bank.in', 'bankofindia.co.in'],
  INDIANBANK: ['indianbank.bank.in', 'indianbank.in'],
  CENTRAL: ['centralbank.bank.in', 'centralbankofindia.co.in'],
  AUSFB: ['au.bank.in', 'aubank.in'],
  BANDHAN: ['bandhan.bank.in', 'bandhanbank.com'],
  SCB: ['sc.bank.in', 'sc.com'],
  HSBC: ['hsbc.bank.in', 'hsbc.co.in'],
  CITI: ['citi.bank.in', 'citibank.co.in', 'citi.com'],
  DBS: ['dbs.bank.in', 'dbs.com'],
  CSB: ['csb.bank.in', 'csb.co.in'],
}

/**
 * Fintechs that market a bank-issued card on their own site.
 *
 * Jupiter's Edge+ is a CSB Bank card documented only on jupiter.money, and a
 * OneCard holder will look for their card on onecard.app. Allowed for every
 * bank, because which bank backs which fintech card changes without notice —
 * but an allowlist all the same, and a short one.
 */
const PARTNER_HOSTS: readonly string[] = [
  'jupiter.money',
  'onecard.app',
  'fi.money',
  'sliceit.com',
]

/**
 * Each bank's own list of its cards.
 *
 * Every URL here was fetched and returned a real card page — not a guessed
 * path. Federal's and CSB's sit behind a bot wall that answers a script with
 * a captcha, so those two are taken from the banks' own sitemap.xml instead.
 *
 * A bank missing a `credit` or `debit` entry is not an oversight:
 *
 *   - AMEX issues no debit cards in India.
 *   - HSBC India publishes no debit-card page.
 *   - IDBI, BOI, AUSFB and DBS sit behind bot protection that refused every
 *     request, so nothing about them could be confirmed. Guessing a path
 *     would ship a link that may 404 in front of a user.
 *   - CITI's Indian consumer card business moved to Axis Bank in 2023; the
 *     pages are gone, and its catalogue entries survive only because cards
 *     issued under those names are still in wallets.
 */
const CARD_PAGES: Record<string, { credit?: string; debit?: string }> = {
  HDFC: {
    credit: 'https://www.hdfc.bank.in/credit-cards',
    debit: 'https://www.hdfc.bank.in/debit-cards',
  },
  ICICI: {
    credit: 'https://www.icici.bank.in/personal-banking/cards/credit-card',
    debit: 'https://www.icici.bank.in/personal-banking/cards/debit-card',
  },
  AXIS: {
    credit: 'https://www.axis.bank.in/cards/credit-card',
    debit: 'https://www.axis.bank.in/cards/debit-card',
  },
  KOTAK: {
    credit: 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards.html',
    debit: 'https://www.kotak.bank.in/en/personal-banking/cards/debit-cards.html',
  },
  SBI: {
    credit: 'https://www.sbicard.com/en/personal/credit-cards.html',
    debit: 'https://sbi.bank.in/web/personal-banking/cards/debit-card',
  },
  AMEX: { credit: 'https://www.americanexpress.com/in/credit-cards/' },
  IDFC: {
    credit: 'https://www.idfcfirst.bank.in/credit-card',
    debit: 'https://www.idfcfirst.bank.in/personal-banking/payments/cards/debit-card',
  },
  CANARA: {
    credit: 'https://www.canarabank.bank.in/credit-cards',
    debit: 'https://www.canarabank.bank.in/debit-cards',
  },
  UNION: {
    credit: 'https://www.unionbankofindia.bank.in/en/listing/credit-cards',
    debit: 'https://www.unionbankofindia.bank.in/en/listing/debit-cards',
  },
  RBL: {
    credit: 'https://www.rbl.bank.in/personal-banking/cards/credit-cards',
    debit: 'https://www.rbl.bank.in/personal-banking/cards/debit-cards',
  },
  INDUSIND: {
    credit: 'https://www.indusind.bank.in/in/en/personal/cards/credit-card.html',
    debit: 'https://www.indusind.bank.in/in/en/personal/cards/debit-card.html',
  },
  YES: {
    credit: 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards',
    debit: 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card',
  },
  BOB: {
    credit: 'https://bankofbaroda.bank.in/digital-products/cards/credit-cards',
    debit: 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards',
  },
  PNB: {
    credit: 'https://creditcard.pnb.bank.in/',
    debit: 'https://pnb.bank.in/card-index.html',
  },
  FEDERAL: {
    credit: 'https://www.federal.bank.in/credit-cards',
    debit: 'https://www.federal.bank.in/debit-cards',
  },
  INDIANBANK: {
    credit: 'https://indianbank.bank.in/en/Credit-Cards',
    debit: 'https://indianbank.bank.in/en/Debit-Cards',
  },
  CENTRAL: {
    credit: 'https://centralbank.bank.in/en/credit-cards',
    debit: 'https://centralbank.bank.in/en/debit-cards',
  },
  BANDHAN: {
    credit: 'https://creditcards.bandhan.bank.in/',
    debit: 'https://bandhan.bank.in/personal/debit-card',
  },
  SCB: {
    credit: 'https://www.sc.bank.in/credit-cards/',
    debit: 'https://www.sc.bank.in/debit-cards/',
  },
  HSBC: { credit: 'https://www.hsbc.bank.in/credit-cards/' },
  CSB: {
    credit: 'https://www.csb.bank.in/credit-card',
    debit: 'https://www.csb.bank.in/csb-debit-cards',
  },
}

/** Exact host or a subdomain of it — never a suffix match. */
function hostMatches(host: string, allowed: string): boolean {
  return host === allowed || host.endsWith(`.${allowed}`)
}

/**
 * Whether a URL may be stored and shown as a card's link.
 *
 * Enforced on the way IN, at the API, because it is an authorisation
 * question and not a display one: a rejected URL is never written, so no
 * later renderer has to remember to re-check it.
 */
export function isAllowedCardUrl(bankCode: string, url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  // https only. An http link to a bank is worth nothing, and any other
  // scheme — javascript:, data: — is an attack rather than a link.
  if (parsed.protocol !== 'https:') return false
  if (parsed.username !== '' || parsed.password !== '') return false

  const host = parsed.hostname.toLowerCase()
  const banks = BANK_HOSTS[bankCode.toUpperCase()] ?? []
  return (
    banks.some((allowed) => hostMatches(host, allowed)) ||
    PARTNER_HOSTS.some((allowed) => hostMatches(host, allowed))
  )
}

/** The bank's own list of cards of this type, if one is on file. */
export function bankCardsPage(
  bankCode: string,
  cardType: CardType,
): string | null {
  return CARD_PAGES[bankCode.toUpperCase()]?.[cardType] ?? null
}

/**
 * Where a card's name should link.
 *
 * `exact` says which of the two levels this is, so the UI can label the
 * destination honestly instead of implying the bank has a page for this
 * precise card when all we have is its card list.
 */
export type CardLink = { url: string; exact: boolean }

export function cardLink(
  bankCode: string,
  cardType: CardType,
  productUrl: string | null,
): CardLink | null {
  if (productUrl && isAllowedCardUrl(bankCode, productUrl)) {
    return { url: productUrl, exact: true }
  }

  const fallback = bankCardsPage(bankCode, cardType)
  return fallback ? { url: fallback, exact: false } : null
}

/** `hdfc.bank.in` — the domain, for showing people where a link goes. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Bank codes this file knows a card page for. Used by its tests. */
export function bankCodesWithCardPages(): string[] {
  return Object.keys(CARD_PAGES)
}

/** Every URL in this file, for the test that checks them all. */
export function allCardPageUrls(): Array<{
  bank: string
  cardType: CardType
  url: string
}> {
  const out: Array<{ bank: string; cardType: CardType; url: string }> = []
  for (const [bank, pages] of Object.entries(CARD_PAGES)) {
    if (pages.credit) out.push({ bank, cardType: 'credit', url: pages.credit })
    if (pages.debit) out.push({ bank, cardType: 'debit', url: pages.debit })
  }
  return out
}
