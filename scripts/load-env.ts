/**
 * Loads .env.local before any other module is evaluated.
 *
 * Must be the FIRST import in every script. Calling dotenv's config() inline
 * does not work: import statements are hoisted, so `src/env.ts` would be
 * evaluated — and throw — before the call ever ran. Imports are evaluated in
 * source order, so a dedicated module imported first is the fix.
 */
import { config } from 'dotenv'

config({ path: process.env.ENV_FILE ?? '.env.local' })
