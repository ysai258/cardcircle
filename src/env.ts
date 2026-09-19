import 'server-only'
import { z } from 'zod'

/**
 * Validated process environment.
 *
 * Importing this module throws at startup if configuration is missing or
 * malformed. Failing loudly on boot is deliberate: a half-configured
 * deployment must not start and silently fall back to weaker crypto.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  APP_MASTER_KEY: z
    .string()
    .min(1, 'APP_MASTER_KEY is required')
    .refine(
      (value) => Buffer.from(value, 'base64').length >= 32,
      'APP_MASTER_KEY must be at least 32 bytes of base64 (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))")',
    ),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  /**
   * Shared secret for the scheduled keep-alive request.
   *
   * Optional: the cron route refuses to run without it, so a deployment
   * that has not set one simply has no keep-alive rather than an open
   * endpoint.
   */
  CRON_SECRET: z.string().min(16).optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    // Print only the offending variable NAMES. Printing values here would
    // write APP_MASTER_KEY straight into the deployment log.
    const names = parsed.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ')
    throw new Error(
      `Invalid environment configuration. Check these variables: ${names}`,
    )
  }

  return parsed.data
}

export const env: Env = loadEnv()

/**
 * True in any deployed environment.
 *
 * Checks Vercel's own marker as well as NODE_ENV because the session
 * cookie's `Secure` flag depends on this value. Vercel does set
 * NODE_ENV=production reliably, but if it were ever missing the cookie would
 * silently ship without Secure — a failure with no visible symptom. Belt and
 * braces is cheap for a flag that protects a bearer credential.
 */
export const isProduction =
  env.NODE_ENV === 'production' || process.env.VERCEL === '1'
