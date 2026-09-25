/**
 * Points banks at logo files served from this origin.
 *
 * WHY THIS IS MANUAL
 *
 * Fetching bank logos programmatically was tried and does not work well
 * enough to ship. Measured, not assumed:
 *
 *   - Google's favicon service returns 16x16 for most Indian banks, and a
 *     generic globe for SBI and CSB.
 *   - DuckDuckGo's icon service returns 16x16 ICO files, and the same
 *     generic fallback for the banks Google missed.
 *   - /apple-touch-icon.png returns an HTML 404 page for most banks; only
 *     ICICI served a real image.
 *   - Clearbit's logo API no longer resolves at all — the service was shut
 *     down after the HubSpot acquisition.
 *
 * A blurry 16px smudge on a card face looks worse than the crisp monogram
 * that is there now, so the monogram is the default and a logo is an
 * upgrade you opt into per bank.
 *
 * HOW TO ADD ONE
 *
 *   1. Put the file in public/banks/, named after the bank's code in
 *      lowercase: public/banks/hdfc.svg, public/banks/sbi.png
 *      SVG is ideal; PNG should be at least 128px square with transparency.
 *   2. Run: npx tsx scripts/set-bank-logos.ts
 *
 * Files are served from this origin, so the Content-Security-Policy stays
 * `img-src 'self'` and no third party learns which banks your users browse
 * — which a hotlinked logo CDN would.
 *
 * Re-running is safe: it only writes rows whose logo_url would change, and
 * clears the column for banks whose file has been removed.
 */
import './load-env'

import { readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { eq, isNotNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { banks } from '../src/db/schema'
import { normalizeDatabaseUrl } from '../src/db/connection-url'

const LOGO_DIR = join(process.cwd(), 'public', 'banks')
const ALLOWED = new Set(['.svg', '.png', '.webp'])

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  let files: string[] = []
  try {
    files = readdirSync(LOGO_DIR)
  } catch {
    console.log(`No ${LOGO_DIR} directory yet — nothing to do.`)
    console.log('Create it and add files named after each bank code, e.g. hdfc.svg')
    return
  }

  // code -> public path, e.g. HDFC -> /banks/hdfc.svg
  const byCode = new Map<string, string>()
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    if (!ALLOWED.has(ext)) continue
    byCode.set(file.slice(0, -ext.length).toUpperCase(), `/banks/${file}`)
  }

  const client = postgres(normalizeDatabaseUrl(url), { max: 1, onnotice: () => {} })
  const db = drizzle(client)

  try {
    const rows = await db
      .select({ id: banks.id, code: banks.code, logoUrl: banks.logoUrl })
      .from(banks)

    let set = 0
    let cleared = 0

    for (const bank of rows) {
      const wanted = byCode.get(bank.code.toUpperCase()) ?? null
      if (wanted === bank.logoUrl) continue

      await db
        .update(banks)
        .set({ logoUrl: wanted, updatedAt: new Date() })
        .where(eq(banks.id, bank.id))

      if (wanted) {
        set += 1
        console.log(`  ${bank.code.padEnd(12)} -> ${wanted}`)
      } else {
        cleared += 1
        console.log(`  ${bank.code.padEnd(12)} -> (cleared, file removed)`)
      }
    }

    const withLogos = await db
      .select({ code: banks.code })
      .from(banks)
      .where(isNotNull(banks.logoUrl))

    console.log(
      `\n${set} set, ${cleared} cleared. ${withLogos.length}/${rows.length} banks now have a logo; the rest show their monogram.`,
    )
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Failed to set bank logos:', error)
  process.exit(1)
})
