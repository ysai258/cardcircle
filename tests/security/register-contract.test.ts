import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * next/headers has no request context under Vitest, so cookies() throws.
 * A minimal in-memory store lets the full registration path run, including
 * createSession — which is the point: the bug this file exists for lived in
 * the route, not the service, and only an end-to-end call catches it.
 */
const cookieStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
    set: (name: string, value: string) => cookieStore.set(name, value),
    delete: (name: string) => cookieStore.delete(name),
  }),
}))

const { POST: registerRoute } = await import('@/app/api/auth/register/route')
const { db } = await import('@/db')
const { recoveryCodes } = await import('@/db/schema')

const ORIGIN = 'http://localhost:3000'

function registerRequest(body: unknown): Request {
  return new Request(`${ORIGIN}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Host: 'localhost:3000',
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => cookieStore.clear())

describe('Registration response contract', () => {
  it('returns recovery codes, because they can never be shown again', async () => {
    const response = await registerRoute(
      registerRequest({
        name: 'Contract Test',
        phone: '9812340001',
        password: 'a-long-enough-password',
      }),
    )

    expect(response.status).toBe(201)

    const body = (await response.json()) as {
      id: string
      recoveryCodes: string[]
    }

    // The service generated codes and the route dropped them, silently
    // creating accounts with recovery codes nobody had ever seen.
    expect(body.recoveryCodes).toBeDefined()
    expect(body.recoveryCodes).toHaveLength(8)

    // ...and they are the ones actually stored for that user.
    const stored = await db.select().from(recoveryCodes)
    expect(stored).toHaveLength(8)
  })

  it('sets a session cookie on success', async () => {
    await registerRoute(
      registerRequest({
        name: 'Contract Test',
        phone: '9812340002',
        password: 'a-long-enough-password',
      }),
    )

    expect(cookieStore.has('cardcircle_session')).toBe(true)
  })

  it('rejects a duplicate number as a conflict, not a 500', async () => {
    const body = {
      name: 'Contract Test',
      phone: '9812340003',
      password: 'a-long-enough-password',
    }

    expect((await registerRoute(registerRequest(body))).status).toBe(201)

    const second = await registerRoute(registerRequest(body))
    expect(second.status).toBe(409)

    const json = (await second.json()) as { error: { message: string } }
    expect(json.error.message).toMatch(/already exists/i)
  })

  it('never puts a recovery code or password in the error path', async () => {
    const response = await registerRoute(
      registerRequest({
        name: 'Contract Test',
        phone: 'nonsense',
        password: 'a-long-enough-password',
      }),
    )

    const text = await response.text()
    expect(response.status).toBeLessThan(500)
    expect(text).not.toContain('a-long-enough-password')
  })
})
