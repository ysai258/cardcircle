/**
 * Applies pending migrations.
 *
 * Creates its own database client rather than importing src/db/index.ts,
 * which is marked `server-only` and would throw outside the Next.js runtime.
 */
import './load-env'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { normalizeDatabaseUrl } from '../src/db/connection-url'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const client = postgres(normalizeDatabaseUrl(url), {
    max: 1,
    onnotice: () => {},
  })

  try {
    await migrate(drizzle(client), { migrationsFolder: './src/db/migrations' })
    console.log('Migrations applied.')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
