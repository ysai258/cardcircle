/**
 * Generates the migration that adds `card_products.product_url` and fills it
 * from src/db/card-product-urls.ts.
 *
 * A script rather than hand-written SQL for the same reason as
 * gen-merge-migration.ts: the slugs have to come from the same productSlug()
 * the application uses. A slug typed by hand that differs by one character
 * matches no row, and the migration then appears to succeed while setting
 * nothing at all — which is exactly the failure mode that made the CSB merge
 * a no-op the first time.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { CARD_PRODUCT_URLS } from '../src/db/card-product-urls'
import { isAllowedCardUrl } from '../src/lib/bank-links'
import { productSlug } from '../src/server/modules/cards/product-slug'

const FILE = '0009_product_urls'
const PATH = `src/db/migrations/${FILE}.sql`

const escape = (value: string): string => value.replace(/'/g, "''")

// A URL that would fail the API's own check must not reach the database
// through a migration either — that would leave rows the application would
// refuse to accept, and the check would be a lie.
const rejected = CARD_PRODUCT_URLS.filter(
  ([bank, , , url]) => !isAllowedCardUrl(bank, url),
)
if (rejected.length > 0) {
  console.error('These URLs are not on their bank’s allowed hosts:')
  for (const [bank, , name, url] of rejected) console.error(`  ${bank} ${name} ${url}`)
  process.exit(1)
}

const rows = CARD_PRODUCT_URLS.map(
  ([bank, cardType, name, url, slug]) =>
    `  ('${escape(bank)}', '${cardType}', '${escape(slug ?? productSlug(name))}', '${escape(url)}')`,
).join(',\n')

const sql = `-- The issuer's own page for each card product.
--
-- Answers the question a card's name asks: "what does this card actually get
-- me?" CardCircle does not know the offers and should not claim to, so the
-- name links to the bank's page for that card instead.
--
-- The column is nullable on purpose. ${CARD_PRODUCT_URLS.length} of the catalogue's products have a
-- confirmed page; the rest fall back to the bank's card-listing page, which
-- lives in code (src/lib/bank-links.ts) because a bank redesigning its site
-- should not need a database migration.
--
-- Every URL here came from the issuer's own sitemap or card-listing page and
-- was then fetched. See src/db/card-product-urls.ts for what that does and
-- does not guarantee.

ALTER TABLE "card_products" ADD COLUMN "product_url" text;--> statement-breakpoint

-- Enforced in the database, not only in Zod: a future code path with a bug
-- must not be able to store a javascript: or http: link that the UI would
-- then render as a bank's own page. The host allowlist cannot be expressed
-- here (it depends on the bank), so it stays in the application; this is the
-- floor beneath it.
ALTER TABLE "card_products" ADD CONSTRAINT "card_products_url_https"
  CHECK ("product_url" IS NULL OR "product_url" LIKE 'https://%');--> statement-breakpoint

UPDATE "card_products" p
SET "product_url" = v.url
FROM (VALUES
${rows}
) AS v(code, card_type, slug, url)
JOIN "banks" b ON b."code" = v.code
WHERE p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug;
`

// Never rewrite a migration that exists: once a file has run somewhere it is
// a record of what that database did.
if (existsSync(PATH)) {
  console.log(`${FILE}: already written, left untouched`)
} else {
  writeFileSync(PATH, sql)
  console.log(`${FILE}: ${CARD_PRODUCT_URLS.length} product URLs written`)
}
