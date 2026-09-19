import { describe, expect, it } from 'vitest'
import { POST as registerRoute } from '@/app/api/auth/register/route'
import { POST as loginRoute } from '@/app/api/auth/login/route'
import { jsonResponse } from '@/server/common/http'
import { findForbiddenKeys } from '@/server/common/redact'

/**
 * The HTTP error boundary.
 *
 * These exist because of a real production failure: a password shorter than
 * the minimum produced `details.password`, the response guard saw a
 * forbidden KEY name, and a helpful 400 became "Internal server error". The
 * commonest signup mistake was unusable and nothing caught it, because every
 * existing test asserted on services rather than on wire responses.
 */

const ORIGIN = 'http://localhost:3000'

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Host: 'localhost:3000',
    },
    body: JSON.stringify(body),
  })
}

type ErrorBody = {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; messages: string[] }>
  }
}

describe('Validation errors reach the client as usable 400s', () => {
  it('reports a short password instead of failing with a 500', async () => {
    const response = await registerRoute(
      post(`${ORIGIN}/api/auth/register`, {
        name: 'Alice',
        phone: '9876543210',
        password: 'short',
      }),
    )

    expect(response.status).toBe(400)

    const body = (await response.json()) as ErrorBody
    expect(body.error.code).toBe('VALIDATION_FAILED')

    const passwordError = body.error.details?.find((d) => d.field === 'password')
    expect(passwordError?.messages[0]).toMatch(/at least 8 characters/i)
  })

  it('reports several bad fields at once', async () => {
    const response = await registerRoute(
      post(`${ORIGIN}/api/auth/register`, {
        name: '',
        phone: 'x',
        password: 'short',
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as ErrorBody
    const fields = body.error.details?.map((d) => d.field) ?? []

    expect(fields).toContain('password')
    expect(fields.length).toBeGreaterThan(1)
  })

  it('rejects unknown keys rather than ignoring them', async () => {
    const response = await registerRoute(
      post(`${ORIGIN}/api/auth/register`, {
        name: 'Alice',
        phone: '9876543210',
        password: 'a-long-enough-password',
        pan: '5401234567891234',
        cvv: '123',
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as ErrorBody
    expect(JSON.stringify(body)).toMatch(/unrecognized keys/i)
  })

  it('never echoes a submitted password back, in any error shape', async () => {
    const secret = 'my-actual-secret-password'

    for (const route of [registerRoute, loginRoute]) {
      const response = await route(
        post(`${ORIGIN}/api/auth/x`, {
          name: 'Alice',
          phone: 'not-a-number',
          password: secret,
        }),
      )
      const text = await response.text()

      expect(text).not.toContain(secret)
      // A field NAME may appear; a value never may.
      expect(response.status).toBeLessThan(500)
    }
  })

  it('rejects a cross-origin request before doing any work', async () => {
    const response = await registerRoute(
      new Request(`${ORIGIN}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.example.com',
          Host: 'localhost:3000',
        },
        body: JSON.stringify({
          name: 'Alice',
          phone: '9876543210',
          password: 'a-long-enough-password',
        }),
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as ErrorBody
    expect(body.error.message).toMatch(/cross-origin/i)
  })
})

describe('The response guard still works', () => {
  // The fix above must not have been achieved by weakening the guard.
  it('blocks a payload carrying a forbidden key and returns 500', () => {
    const response = jsonResponse({ card: { cvv: '123' } })
    expect(response.status).toBe(500)
  })

  it('blocks a forbidden key nested at any depth', () => {
    const response = jsonResponse({ a: { b: [{ passwordHash: 'x' }] } })
    expect(response.status).toBe(500)
  })

  it('allows a field-error list mentioning a sensitive field NAME', () => {
    // The shape the fix introduced: the name is a value, not a key.
    const response = jsonResponse({
      error: {
        code: 'VALIDATION_FAILED',
        details: [{ field: 'password', messages: ['Too short'] }],
      },
    })

    expect(response.status).toBe(200)
  })

  it('agrees with findForbiddenKeys about the new shape', () => {
    expect(
      findForbiddenKeys({
        error: { details: [{ field: 'password', messages: ['Too short'] }] },
      }),
    ).toEqual([])

    expect(findForbiddenKeys({ error: { details: { password: ['x'] } } })).toEqual(
      ['error.details.password'],
    )
  })
})
