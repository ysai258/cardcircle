import { count } from 'drizzle-orm'
import { db } from '@/db'
import { banks } from '@/db/schema'
import { env } from '@/env'
import { jsonResponse } from '@/server/common/http'
import { logger } from '@/server/common/logger'
import { newRequestId } from '@/server/common/http'

export const dynamic = 'force-dynamic'

/**
 * Keeps the database from pausing, and proves it is actually serving data.
 *
 * Supabase's free tier pauses a project after about a week with no
 * activity, and un-pausing is a manual step in their dashboard. A query a
 * few times a day resets that clock, so the pause never arrives.
 *
 * This is why Supabase beats Neon here rather than merely differing: Neon's
 * free tier suspends after ~5 minutes, which would need a ping every few
 * minutes — roughly 360 a day, beyond Hobby's daily cron, and ~730
 * compute-hours a month against a 191-hour allowance. A once-daily ping
 * cannot rescue that. It comfortably rescues a seven-day clock.
 *
 * WHY IT COUNTS ROWS IN A REAL TABLE
 *
 * This used to run `SELECT 1`, which never touches a table and so proves
 * only that a connection opened. Counting `banks` reads real data through
 * the same path the app uses, which leaves no doubt that the ping is
 * database activity — and it re-checks the one invariant this project has
 * already broken once: a deployment whose `banks` table is empty looks
 * healthy and is completely unusable, because the Add Card form is driven
 * by it. An empty count fails the request so the alert fires, rather than
 * waiting for a user to find it.
 *
 * Authenticated with a shared secret because it is a public URL that costs
 * a database round trip. Callers send CRON_SECRET as a bearer token: Vercel
 * Cron does it automatically, and the GitHub Actions schedule in
 * .github/workflows/keep-alive.yml sends the same header. Absent the secret
 * the route refuses outright, so a misconfigured deployment has no
 * keep-alive rather than an open endpoint.
 */
export async function GET(request: Request): Promise<Response> {
  const requestId = newRequestId()
  const expected = env.CRON_SECRET

  if (!expected) {
    logger.warn('Keep-alive called but CRON_SECRET is not configured', {
      requestId,
    })
    return jsonResponse(
      { error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404, requestId },
    )
  }

  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // whether this endpoint exists.
    return jsonResponse(
      { error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404, requestId },
    )
  }

  const startedAt = Date.now()
  const [row] = await db.select({ total: count() }).from(banks)
  const durationMs = Date.now() - startedAt
  const bankCount = Number(row?.total ?? 0)

  if (bankCount === 0) {
    // Reachable but empty. Shout: every caller of this route treats a
    // non-200 as a page, and nobody else is watching.
    logger.error('Keep-alive found no banks — the catalogue is empty', {
      requestId,
      durationMs,
    })
    return jsonResponse(
      {
        error: {
          code: 'INTERNAL',
          message: 'Database is reachable but the bank table is empty',
        },
      },
      { status: 500, requestId },
    )
  }

  // Logged so a creeping wake-up time is visible before users notice it.
  logger.info('Database keep-alive', { requestId, durationMs, bankCount })

  return jsonResponse({ ok: true, durationMs, bankCount }, { requestId })
}
