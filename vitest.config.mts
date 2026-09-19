import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Loaded here, in the config, so it is in place before any test module —
// including src/env.ts, which throws on missing configuration — is evaluated.
// .env.test first: dotenv does not overwrite already-set variables, so the
// test database wins over .env.local. Tests truncate every table, and must
// never be pointed at the development database.
loadEnv({ path: process.env.ENV_FILE ?? '.env.test' })
loadEnv({ path: '.env.local' })

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  // See tests/helpers/server-only-stub.ts for why.
  'server-only': fileURLToPath(
    new URL('./tests/helpers/server-only-stub.ts', import.meta.url),
  ),
}

/**
 * Three suites, separated by what they need to run:
 *
 *  - unit      pure functions, no I/O. The authorisation resolver lives here.
 *  - security  authorisation and leakage assertions against a real database.
 *  - schema    static checks over the schema source; no database.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'schema',
          environment: 'node',
          include: ['tests/schema/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'security',
          environment: 'node',
          include: ['tests/security/**/*.test.ts'],
          setupFiles: ['tests/helpers/setup-db.ts'],
          // Security tests share one database; running files in parallel
          // would let one suite's truncate wipe another's fixtures.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
