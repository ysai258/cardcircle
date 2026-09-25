import { sql } from 'drizzle-orm'
import { afterAll, beforeEach } from 'vitest'
import { db, sqlClient } from '@/db'

/**
 * Database lifecycle for the security suite.
 *
 * Truncates before every test so each one starts from a known-empty state.
 * These tests assert on absence ("a stranger sees no cards"), and a stray row
 * from a previous test is exactly what turns such an assertion into a false
 * pass.
 */

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE audit_logs, reports, blocks, friendships,
        cards, card_products, sessions, users, banks, rate_limits
        RESTART IDENTITY CASCADE`,
  )
})

afterAll(async () => {
  await sqlClient.end()
})
