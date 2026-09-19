import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env, isProduction } from '@/env'
import { normalizeDatabaseUrl } from './connection-url'
import { schema } from './schema'

/**
 * Database client.
 *
 * `max: 1` because this deploys to Vercel's serverless functions: each
 * invocation is its own short-lived process, so a large per-instance pool
 * multiplies across concurrent invocations and exhausts the Postgres
 * connection limit. Connection pooling is delegated to the provider's pooler
 * (Neon's pgbouncer endpoint), which is also why prepared statements are
 * disabled — pgbouncer in transaction mode cannot support them.
 *
 * In development the client is cached on globalThis so Next.js hot reloads
 * do not leak a new connection on every edit.
 */
function createClient() {
  return postgres(normalizeDatabaseUrl(env.DATABASE_URL), {
    max: isProduction ? 1 : 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
}

type GlobalWithClient = typeof globalThis & {
  __cardcircleSql?: ReturnType<typeof createClient>
}

const globalWithClient = globalThis as GlobalWithClient

const client = globalWithClient.__cardcircleSql ?? createClient()

if (!isProduction) {
  globalWithClient.__cardcircleSql = client
}

export const db = drizzle(client, { schema, logger: false })

export type Database = typeof db
export { client as sqlClient }
