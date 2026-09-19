import 'server-only'
import { createHash } from 'node:crypto'
import { lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { rateLimits } from '@/db/schema'
import { rateLimited } from './errors'

/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * Postgres rather than an in-process counter because this deploys to
 * serverless functions: an in-memory map is per-instance and resets on every
 * cold start, which makes it worthless as a control. Redis would be faster,
 * but Postgres is already here and costs nothing.
 *
 * The counter increments atomically via INSERT .. ON CONFLICT DO UPDATE, so
 * concurrent requests cannot race past the limit.
 */

export type RateLimitRule = {
  readonly limit: number
  readonly windowSeconds: number
}

/**
 * Limits are deliberately generous for humans and restrictive for scripts.
 *
 * `userSearch` and `friendRequest` are the enumeration-sensitive ones: they
 * are the endpoints that let a caller learn whether a phone number is
 * registered, so they are the tightest.
 */
export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  userSearch: { limit: 20, windowSeconds: 60 * 60 },
  friendRequest: { limit: 20, windowSeconds: 24 * 60 * 60 },
  cardDetail: { limit: 240, windowSeconds: 60 * 60 },
  cardWrite: { limit: 60, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitName = keyof typeof RATE_LIMITS

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Hashes the identifier portion of a rate-limit key.
 *
 * Keys land in a database table; an un-hashed key would turn `rate_limits`
 * into a plaintext log of which phone numbers and IP addresses touched the
 * service. Hashing keeps the counter useful and the table uninformative.
 */
function keyFor(name: RateLimitName, identifier: string): string {
  const digest = createHash('sha256')
    .update(`${name}:${identifier}`, 'utf8')
    .digest('base64url')
    .slice(0, 32)
  return `${name}:${digest}`
}

function windowStartFor(rule: RateLimitRule, now: Date): Date {
  const windowMs = rule.windowSeconds * 1000
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs)
}

export async function consumeRateLimit(
  name: RateLimitName,
  identifier: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name]
  const key = keyFor(name, identifier)
  const windowStart = windowStartFor(rule, now)

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })

  const count = row?.count ?? 1
  const windowEndMs = windowStart.getTime() + rule.windowSeconds * 1000
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEndMs - now.getTime()) / 1000),
  )

  // Opportunistic cleanup, ~1% of calls, so the table does not grow forever
  // without needing a scheduled job on the free tier.
  if (Math.random() < 0.01) {
    void pruneExpiredWindows(now)
  }

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds,
  }
}

/** Consumes a slot and throws a 429 if the caller is over the limit. */
export async function enforceRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<void> {
  const result = await consumeRateLimit(name, identifier)
  if (!result.allowed) {
    throw rateLimited(
      `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
    )
  }
}

async function pruneExpiredWindows(now: Date): Promise<void> {
  const oldest = new Date(now.getTime() - 24 * 60 * 60 * 1000 * 2)
  try {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, oldest))
  } catch {
    // Cleanup is best-effort; never fail a request because pruning failed.
  }
}
