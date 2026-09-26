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
]

const escape = (value: string): string => value.replace(/'/g, "''")

const urlFor = new Map(
  CARD_PRODUCT_URLS.map(([bank, cardType, name, url]) => [
    `${bank}:${cardType}:${name}`,
    url,
  ]),
)

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
        const url = urlFor.get(`${seed.bank}:${cardType}:${name}`) ?? null
        rows.push(
          `  ('${escape(seed.bank)}', '${cardType}', '${escape(name)}', '${escape(productSlug(name))}', ${
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
