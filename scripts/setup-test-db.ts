/**
 * Creates and migrates the dedicated test database.
 *
 * The security suite truncates every table between tests. Pointing it at the
 * development database means a test run silently destroys your seed data —
 * so the suites get their own database, and this script makes sure it exists
 * and is at the current schema before they run.
 */
import './load-env'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { normalizeDatabaseUrl } from '../src/db/connection-url'

const TEST_DATABASE = 'cardcircle_test'

async function main(): Promise<void> {
  const devUrl = process.env.DATABASE_URL
  if (!devUrl) throw new Error('DATABASE_URL is not set')

  const testUrl = new URL(devUrl)
  testUrl.pathname = `/${TEST_DATABASE}`

  // Connect to the default database to issue CREATE DATABASE, which cannot
  // run inside a transaction or against the database being created.
  const adminUrl = new URL(devUrl)
  adminUrl.pathname = '/postgres'

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} })
  try {
    const existing = await admin`
      SELECT 1 FROM pg_database WHERE datname = ${TEST_DATABASE}
    `
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${TEST_DATABASE}"`)
      console.log(`Created database ${TEST_DATABASE}.`)
    }
  } finally {
    await admin.end()
  }

  const client = postgres(normalizeDatabaseUrl(testUrl.toString()), {
    max: 1,
    onnotice: () => {},
  })
  try {
    await migrate(drizzle(client), { migrationsFolder: './src/db/migrations' })
    console.log(`${TEST_DATABASE} is up to date.`)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Test database setup failed:', error)
  process.exit(1)
})
