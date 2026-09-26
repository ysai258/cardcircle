/**
 * Reports which product URLs actually landed.
 *
 * Exists because a migration that joins on a slug can match nothing and still
 * report success. The first run of 0009 set 147 of 149 URLs: the two Jupiter
 * co-brands are stored under a slug that differs from the one derived from
 * their display name, so they joined to no row. Nothing failed — the count
 * was simply two short, and only counting found it.
 *
 * Run against any database after migrating:
 *   npm run db:check-product-urls
 *
 * Read-only. Safe against production.
 */
import './load-env'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { CARD_PRODUCT_URLS } from '../src/db/card-product-urls'
import { normalizeDatabaseUrl } from '../src/db/connection-url'
import { banks, cardProducts } from '../src/db/schema'
import { isAllowedCardUrl } from '../src/lib/bank-links'
import { productSlug } from '../src/server/modules/cards/product-slug'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const client = postgres(normalizeDatabaseUrl(url), { max: 1, onnotice: () => {} })
  const db = drizzle(client)

  try {
    const rows = await db
      .select({
        code: banks.code,
        cardType: cardProducts.cardType,
        slug: cardProducts.slug,
        name: cardProducts.name,
        productUrl: cardProducts.productUrl,
      })
      .from(cardProducts)
      .innerJoin(banks, eq(banks.id, cardProducts.bankId))

    const stored = new Map(
      rows.map((row) => [`${row.code}:${row.cardType}:${row.slug}`, row]),
    )

    const missing: string[] = []
    const different: string[] = []

    for (const [bank, cardType, name, expected, slug] of CARD_PRODUCT_URLS) {
      const key = `${bank}:${cardType}:${slug ?? productSlug(name)}`
      const row = stored.get(key)

      if (!row) {
        missing.push(`${key}  (${name}) — no such product`)
        continue
      }
      if (row.productUrl !== expected) {
        different.push(`${key}  stored=${row.productUrl ?? 'NULL'}  expected=${expected}`)
      }
    }

    // A row whose host is not the bank's would be rendered as a plain name
    // rather than a link, so it is worth naming even though nothing breaks.
    const offHost = rows.filter(
      (row) => row.productUrl !== null && !isAllowedCardUrl(row.code, row.productUrl),
    )

    const withUrl = rows.filter((row) => row.productUrl !== null).length
    console.log(`${withUrl} of ${rows.length} products carry a URL`)
    console.log(`${CARD_PRODUCT_URLS.length} expected from card-product-urls.ts`)

    for (const line of missing) console.log(`  MISSING   ${line}`)
    for (const line of different) console.log(`  DIFFERENT ${line}`)
    for (const row of offHost) {
      console.log(`  OFF-HOST  ${row.code} ${row.name} -> ${row.productUrl}`)
    }

    const problems = missing.length + different.length
    if (problems === 0 && offHost.length === 0) {
      console.log('\nEvery expected URL is in place.')
    } else {
      console.log(`\n${problems} mismatch(es), ${offHost.length} off-host.`)
      process.exitCode = 1
    }
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Check failed:', error)
  process.exit(1)
})
