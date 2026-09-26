/**
 * Generates a catalogue migration: products to add, and stale ones to drop.
 *
 * A script rather than hand-written SQL for the reason gen-merge-migration.ts
 * gives: the slugs must come from the same productSlug() the application
 * uses. A slug typed by hand that differs by one character matches no row,
 * and the migration then appears to succeed while doing nothing — which is
 * exactly how the CSB merge silently became a no-op the first time.
 *
 * Batches are kept as history, never edited once applied: a migration that
 * has run is a record of what a database did.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { CARD_PRODUCT_URLS } from '../src/db/card-product-urls'
import { CARD_PRODUCTS } from '../src/db/card-products'
import { productSlug } from '../src/server/modules/cards/product-slug'

type Batch = {
  file: string
  header: string
  /** Bank codes whose catalogue entries should all exist after this runs. */
  addFromCatalogue: string[]
  /** [bank, cardType, name] entries to drop when no card references them. */
  drop: Array<[string, 'credit' | 'debit', string]>
}

const BATCHES: Batch[] = [
  {
    file: '0010_canara_catalogue',
    header: `-- Canara's real card range, taken from Canara.
--
-- The seed list had four Canara credit cards and three debit ones, with
-- names like "Canara Platinum Debit" that were never a card anybody holds.
-- Canara publishes 16 credit cards and 15 debit cards, each on its own page:
-- what this catalogue called "Canara Platinum Debit" is five separate real
-- products (Visa Platinum, Mastercard Platinum, Mastercard Platinum Women,
-- RuPay Platinum Domestic, RuPay Platinum International).
--
-- A vague name fails twice over. It cannot answer "who among my friends has
-- THIS card", because five different cards answer to it. And it cannot be
-- linked to the issuer's page, because there are five pages.
--
-- Every name and URL below came from canarabank.bank.in's own credit-card
-- and debit-card lists; each page was then opened and its <h1> read back.
-- One listing label was wrong -- the millennial card carried the women's
-- card's heading -- and the page itself is what caught it.
--
-- The four existing credit entries already named real cards, so they are
-- left alone and simply gain a URL in 0009's column.
--
-- "Canara RuPay Debit" is NOT dropped: a member's card points at it, and
-- only its owner knows which of the five RuPay variants they hold. It stays
-- until they re-pick. The other two vague debit names go, but only where
-- nobody selected them.`,
    addFromCatalogue: ['CANARA'],
    drop: [
      ['CANARA', 'debit', 'Canara Classic Debit'],
      ['CANARA', 'debit', 'Canara Platinum Debit'],
    ],
  },
  {
    file: '0011_issuer_catalogues',
    header: `-- Six more banks, taken from the banks.
--
-- Same problem as Canara in 0010, at six times the size. The seed list
-- described Union Bank's range as "Platinum", "Classic" and "Signature";
-- Union Bank publishes thirteen credit cards and eight debit cards, each on
-- its own page. Bandhan's four seeded credit cards -- Standard, Select,
-- Premium, One -- correspond to nothing Bandhan sells: its cards are Flare,
-- Ignite, Lumina and Sparks.
--
-- Every name and URL below came from the bank's own card listing. 84 pages
-- were fetched and all 84 answered; where a page renders a heading, that
-- heading was read back and is what the name says. PNB's per-card pages name
-- their card in a <div class="leftbluelink title"> rather than a heading, so
-- all 22 were diffed against each other to confirm the pages really differ
-- by card before any of them was linked.
--
-- WHAT IS NOT HERE
--
-- Central Bank's five debit cards are added by name but carry no link: the
-- bank lists them as text on one page and publishes no page per card. Its
-- credit cards are absent entirely -- its credit-card page has no card list
-- at all and links to sbicard.com, so the three seeded names could not be
-- checked either way and are left untouched rather than guessed at.
--
-- YES Bank is missing for a duller reason: its site refuses automated
-- requests, so none of its range could be read. Its seeded names stand.
--
-- PNB's debit cards and HSBC's have no per-card pages either, so those
-- seeded names also stand.
--
-- Names that named nothing real are dropped, but only where no member had
-- selected one -- the same rule as 0006 and 0010.`,
    addFromCatalogue: ['UNION', 'BANDHAN', 'HSBC', 'PNB', 'BOB', 'CENTRAL'],
    drop: [
      ['UNION', 'credit', 'Union Bank Platinum'],
      ['UNION', 'credit', 'Union Bank Classic'],
      ['UNION', 'credit', 'Union Bank Signature'],
      ['UNION', 'debit', 'Union Bank Classic Debit'],
      ['UNION', 'debit', 'Union Bank Platinum Debit'],
      ['UNION', 'debit', 'Union Bank RuPay Debit'],
      ['BANDHAN', 'credit', 'Bandhan Bank Standard'],
      ['BANDHAN', 'credit', 'Bandhan Bank Select'],
      ['BANDHAN', 'credit', 'Bandhan Bank Premium'],
      ['BANDHAN', 'credit', 'Bandhan Bank One'],
      ['BANDHAN', 'debit', 'Bandhan Classic Debit'],
      ['BANDHAN', 'debit', 'Bandhan Platinum Debit'],
      ['BANDHAN', 'debit', 'Bandhan RuPay Debit'],
      ['HSBC', 'credit', 'HSBC Cashback'],
      ['HSBC', 'credit', 'HSBC Platinum'],
      ['HSBC', 'credit', 'HSBC Premier Mastercard'],
      ['PNB', 'credit', 'PNB Global Gold'],
      ['PNB', 'credit', 'PNB Global Classic'],
      ['BOB', 'debit', 'BOB Classic Debit'],
      ['BOB', 'debit', 'BOB Platinum Debit'],
      ['CENTRAL', 'debit', 'Central Bank Classic Debit'],
      ['CENTRAL', 'debit', 'Central Bank Platinum Debit'],
      ['CENTRAL', 'debit', 'Central Bank RuPay Debit'],
    ],
  },
  {
    file: '0012_yes_catalogue',
    header: `-- YES Bank, finally.
--
-- 0011 left YES Bank out because its site refuses automated requests: curl
-- gets an empty JavaScript shell, and headless Chromium gets an outright
-- ERR_HTTP2_PROTOCOL_ERROR. The block turned out to be on the TLS and HTTP/2
-- fingerprint rather than on browsers as such -- driving the real Chrome
-- binary instead of bundled Chromium renders both pages in full.
--
-- What it shows is a range nothing like the seeded one. YES Bank sells 22
-- credit cards and 28 debit cards; this catalogue listed seven and three,
-- and five of the credit names correspond to nothing it sells any more --
-- "YES First Preferred" and "YES First Exclusive" predate a rebrand, and the
-- credit card called "Premia" is now a debit card.
--
-- 47 products added, 36 of them linked. The 11 without a link are real cards
-- named on the page whose tile leads to a generic application form rather
-- than to a page about that card; a link to an apply form is not a link to
-- the card, so they get none.
--
-- "YES Marquee" stays and is NOT re-added as "YES MARQUEE". Matching here is
-- on the slug rather than the name, because those two differ only in case
-- and are one card: comparing names would have split the answer to "who has
-- a Marquee" across two products, and the unique index would have rejected
-- the second row anyway.`,
    addFromCatalogue: ['YES'],
    drop: [
      ['YES', 'credit', 'YES Prosperity Rewards Plus'],
      ['YES', 'credit', 'YES Premia'],
      ['YES', 'credit', 'YES First Preferred'],
      ['YES', 'credit', 'YES First Exclusive'],
      ['YES', 'credit', 'Paisabazaar PaisaSave YES'],
      ['YES', 'debit', 'YES Prosperity Debit'],
      ['YES', 'debit', 'YES Platinum Debit'],
    ],
  },
  {
    file: '0013_blocked_banks',
    header: `-- The four banks that looked unreadable, and a link that was wrong.
--
-- AU, IDBI, DBS and Bank of India were left out of every earlier batch as
-- "refuses automated requests". Three of the four were the same false
-- negative as YES Bank: they reject curl and bundled Chromium on the TLS
-- fingerprint, and render normally for the real Chrome binary. Only Bank of
-- India is genuinely shut -- its Cloudflare challenge does not resolve
-- headless, so its seven seeded names stand untouched and unverified.
--
-- 58 products added, 56 of them linked; 15 seeded names that already named
-- a real card gain one. IDBI goes from 8 products, none linked, to 22 with
-- every one linked.
--
-- HOW EACH PAGE WAS CONFIRMED
--
-- IDBI's card pages all render the same banner heading, so the heading
-- proves nothing; each was read further down instead, where the page names
-- its own card ("Royale Signature Credit Card", "Euphoria Credit Card").
-- That also corrected the seeded "Euphoria World" to "Euphoria".
--
-- AU's tiles carry no links, so the names came from the tiles and the URLs
-- from the surrounding markup; four cards (Xcite, Xcite Ultra, Xcite Ace,
-- InstaPay) have no page at all and are added name-only.
--
-- A LINK THAT POINTED AT THE WRONG CARD
--
-- csb.bank.in/csb-bank-edge-credit-card renders <h1>Edge+ CSB Bank RuPay
-- Credit Card</h1>. It is the Edge PLUS page. 0009 had the plain Edge card
-- pointing at it, which sent anyone asking about Edge to a different card.
-- Edge now points at Jupiter's own Edge page and Edge+ at CSB's, both read
-- back from the pages themselves. CSB is in the insert list for that fix
-- alone; none of its other entries change.
--
-- Federal's site rate-limits after a few requests, so five of its credit
-- URLs and seven debit ones are taken from its own card listing without a
-- page read. Two were read and confirmed before the block: the Imperio page
-- names itself "Federal Bank Mastercard Imperio Credit Card", and the
-- visa-imperio path Federal also lists renders the CELESTA heading -- so
-- that one is deliberately not used.`,
    addFromCatalogue: ['AUSFB', 'IDBI', 'DBS', 'FEDERAL', 'CSB'],
    drop: [
      ['AUSFB', 'debit', 'AU Signature Debit'],
      ['IDBI', 'debit', 'IDBI Platinum Debit'],
      ['IDBI', 'debit', 'IDBI RuPay Debit'],
      ['IDBI', 'debit', 'IDBI Gold Debit'],
      ['DBS', 'credit', 'DBS Bank Platinum'],
      ['DBS', 'credit', 'DBS digibank Rewards'],
      ['FEDERAL', 'debit', 'Federal Bank Platinum Debit'],
      ['FEDERAL', 'debit', 'Federal Bank Signature Debit'],
    ],
  },
]

const escape = (value: string): string => value.replace(/'/g, "''")

const urlFor = new Map(
  CARD_PRODUCT_URLS.map(([bank, cardType, name, url]) => [
    `${bank}:${cardType}:${name}`,
    url,
  ]),
)

/**
 * The slug a product is actually stored under, when it differs from the one
 * its display name produces.
 *
 * card-product-urls.ts already carries these overrides for the two Jupiter
 * co-brands, whose names end in "(Jupiter)" while their slugs do not. Without
 * reusing them here, the INSERT's ON CONFLICT never fires and the migration
 * adds a SECOND copy of the card rather than updating the first — which is
 * exactly what the first run of 0013 did.
 */
const slugFor = new Map<string, string>([
  // Migration 0006 seeded the three Jupiter co-brands with a "(Jupiter)"
  // suffix on the NAME so their holders can find them, while the slug stayed
  // the card's official identity. Listed here rather than derived from
  // card-product-urls.ts because a product needs its stored slug whether or
  // not it has a link — the Federal one has none.
  ['CSB:credit:Edge+ CSB Bank RuPay Credit Card (Jupiter)', 'edge-plus-csb-bank-rupay-credit-card'],
  ['CSB:credit:Edge CSB Bank RuPay Credit Card (Jupiter)', 'edge-csb-bank-rupay-credit-card'],
  ['FEDERAL:credit:Edge Federal Bank VISA Credit Card (Jupiter)', 'edge-federal-bank-visa-credit-card'],
  ...CARD_PRODUCT_URLS.filter(([, , , , slug]) => slug).map(
    ([bank, cardType, name, , slug]) =>
      [`${bank}:${cardType}:${name}`, slug as string] as [string, string],
  ),
])

for (const batch of BATCHES) {
  const path = `src/db/migrations/${batch.file}.sql`
  if (existsSync(path)) {
    console.log(`${batch.file}: already written, left untouched`)
    continue
  }

  const rows: string[] = []
  for (const seed of CARD_PRODUCTS) {
    if (!batch.addFromCatalogue.includes(seed.bank)) continue
    for (const cardType of ['credit', 'debit'] as const) {
      for (const name of seed[cardType]) {
        const key = `${seed.bank}:${cardType}:${name}`
        const url = urlFor.get(key) ?? null
        const slug = slugFor.get(key) ?? productSlug(name)
        rows.push(
          `  ('${escape(seed.bank)}', '${cardType}', '${escape(name)}', '${escape(slug)}', ${
            url === null ? 'NULL' : `'${escape(url)}'`
          })`,
        )
      }
    }
  }

  const drops = batch.drop
    .map(
      ([bank, cardType, name]) =>
        `  ('${escape(bank)}', '${cardType}', '${escape(productSlug(name))}')`,
    )
    .join(',\n')

  const sql = `${batch.header}

-- Added, never replaced: a product that is already there keeps its id, so
-- every card pointing at it is untouched.
--
-- The URL, unlike a member-supplied one, IS overwritten. 0009's rule that a
-- link may be added but never changed protects members from each other; this
-- batch is the issuer's own list correcting a URL that an earlier batch of
-- this same catalogue guessed at. It never writes NULL over a URL that is
-- already there.
INSERT INTO "card_products" ("bank_id", "card_type", "name", "slug", "product_url", "is_verified")
SELECT b."id", v.card_type::"card_type", v.name, v.slug, v.url, true
FROM (VALUES
${rows.join(',\n')}
) AS v(code, card_type, name, slug, url)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT ("bank_id", "card_type", "slug") DO UPDATE
  SET "product_url" = EXCLUDED."product_url"
  WHERE EXCLUDED."product_url" IS NOT NULL;--> statement-breakpoint

-- Dropped only where nobody selected one. A product a real member picked
-- stays, vague name and all, rather than breaking their card.
DELETE FROM "card_products" p
USING "banks" b, (VALUES
${drops}
) AS v(code, card_type, slug)
WHERE b."code" = v.code
  AND p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
`

  writeFileSync(path, sql)
  console.log(`${batch.file}: ${rows.length} products, ${batch.drop.length} drops`)
}
