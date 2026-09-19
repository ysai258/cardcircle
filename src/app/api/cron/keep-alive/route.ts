import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { env } from '@/env'
import { jsonResponse } from '@/server/common/http'
import { logger } from '@/server/common/logger'
import { newRequestId } from '@/server/common/http'

export const dynamic = 'force-dynamic'

/**
 * Keeps the database from pausing.
 *
 * Supabase's free tier pauses a project after about a week with no
 * activity, and un-pausing is a manual step in their dashboard. One trivial
 * query a day resets that clock, so the pause never arrives.
 *
 * This is why Supabase beats Neon here rather than merely differing: Neon's
 * free tier suspends after ~5 minutes, which would need a ping every few
 * minutes — roughly 360 a day, beyond Hobby's daily cron, and ~730
 * compute-hours a month against a 191-hour allowance. A once-daily ping
 * cannot rescue that. It comfortably rescues a seven-day clock.
 *
 * Authenticated with a shared secret because it is a public URL that costs
 * a database round trip. Vercel Cron sends CRON_SECRET as a bearer token.
 * Absent the secret the route refuses outright, so a misconfigured
 * deployment has no keep-alive rather than an open endpoint.
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
  await db.execute(sql`SELECT 1`)
  const durationMs = Date.now() - startedAt

  // Logged so a creeping wake-up time is visible before users notice it.
  logger.info('Database keep-alive', { requestId, durationMs })

  return jsonResponse({ ok: true, durationMs }, { requestId })
}
