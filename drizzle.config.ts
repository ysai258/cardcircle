import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside Next.js, so it does not get .env.local for free.
config({ path: '.env.local' })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
