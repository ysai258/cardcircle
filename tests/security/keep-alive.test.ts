import { describe, expect, it } from 'vitest'
import { GET as keepAlive } from '@/app/api/cron/keep-alive/route'
import { db } from '@/db'
import { banks } from '@/db/schema'
import { env } from '@/env'

/**
 * The keep-alive endpoint.
 *
 * It had no test, and that is exactly how it failed: the Supabase project
 * paused on 24 Oct 2026 while the cron was enabled, firing daily and
 * reporting a 50% error rate that nobody was watching. A route whose whole
 * job is to run unattended needs its contract pinned down.
 *
 * Two things matter here. It is a public URL that costs a database round
 * trip, so an unauthenticated caller must learn nothing. And its success
 * must mean the database actually served data, not merely that a socket
 * opened.
 */

const URL_ = 'https://cardcircle.example/api/cron/keep-alive'

const call = (headers: HeadersInit = {}) =>
  keepAlive(new Request(URL_, { headers }))

describe('keep-alive authorisation', () => {
  it('refuses a caller with no credential, and says nothing about itself', async () => {
    const response = await call()
    expect(response.status).toBe(404)

    const body = (await response.json()) as { error: { code: string } }
    // 404, not 401: a 401 would confirm the endpoint exists.
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('refuses the wrong secret with the same 404', async () => {
    const wrong = await call({ authorization: 'Bearer not-the-secret' })
    const missing = await call()

    expect(wrong.status).toBe(404)
    expect(await wrong.json()).toEqual(await missing.json())
  })

  it('refuses a secret passed without the Bearer scheme', async () => {
    const response = await call({ authorization: env.CRON_SECRET ?? '' })
    expect(response.status).toBe(404)
  })
})

describe('keep-alive success', () => {
  it('reports the row count it actually read', async () => {
    await db.insert(banks).values({ name: 'Keep Alive Bank', code: 'KEEPALIVE' })

    const response = await call({
      authorization: `Bearer ${env.CRON_SECRET}`,
    })
    expect(response.status).toBe(200)

    const body = (await response.json()) as { ok: boolean; bankCount: number }
    expect(body.ok).toBe(true)
    // The point of counting a real table rather than SELECT 1.
    expect(body.bankCount).toBeGreaterThan(0)
  })

  /**
   * A reachable database with an empty `banks` table looks healthy and is
   * unusable — the Add Card form is driven entirely by that table, and this
   * project shipped exactly that state once before. Failing here is what
   * turns it into an alert instead of a user's bug report.
   */
  it('fails loudly when the catalogue is empty', async () => {
    const response = await call({
      authorization: `Bearer ${env.CRON_SECRET}`,
    })

    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: { message: string } }
    expect(body.error.message).toMatch(/empty/i)
  })
})
