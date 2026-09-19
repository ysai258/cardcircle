import 'server-only'
import type { UserRow } from '@/db/schema'
import { getCurrentUser } from '@/server/modules/auth/session'
import { AppError, ERROR_CODES, unauthenticated } from './errors'
import { errorResponse, newRequestId } from './http'
import { requestLogger, type RequestLogger } from './logger'

/**
 * Route handler plumbing.
 *
 * Wrapping every handler guarantees three things happen on every request and
 * cannot be forgotten on a new endpoint: a request id exists, errors are
 * converted without leaking internals, and state-changing requests are
 * CSRF-checked.
 */

export type RouteCtx = {
  request: Request
  requestId: string
  log: RequestLogger
  /** Stable per-caller identifier for rate limiting. */
  clientId: string
}

export type AuthedCtx = RouteCtx & { user: UserRow }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Derives a rate-limit identity from the request.
 *
 * Vercel sets x-forwarded-for; the leftmost entry is the client. Falls back
 * to a constant, which makes the limit global rather than per-caller —
 * degraded but still a limit, which is the safe direction to fail.
 */
function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown-client'
}

/**
 * CSRF defence for state-changing requests.
 *
 * SameSite=Lax on the session cookie already blocks cross-site form POSTs,
 * but it is a single control enforced entirely by the browser. Comparing
 * Origin against Host is a cheap second one that does not depend on the
 * browser getting SameSite right.
 *
 * Browsers send Origin on every POST/PATCH/DELETE, so a missing Origin on an
 * unsafe method is not a browser request and is rejected.
 */
function assertSameOrigin(request: Request): void {
  if (SAFE_METHODS.has(request.method)) return

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin || !host) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      'Missing Origin header on a state-changing request',
    )
  }

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Malformed Origin header')
  }

  if (originHost !== host) {
    throw new AppError(
      ERROR_CODES.VALIDATION_FAILED,
      'Cross-origin request rejected',
    )
  }
}

/** Wraps a handler that does not require authentication. */
export function route(
  handler: (ctx: RouteCtx) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = newRequestId()
    const log = requestLogger(requestId)

    try {
      assertSameOrigin(request)
      return await handler({
        request,
        requestId,
        log,
        clientId: clientIdentifier(request),
      })
    } catch (error) {
      return errorResponse(error, requestId)
    }
  }
}

/**
 * Wraps a handler that requires an authenticated user.
 *
 * Authentication is resolved here, in the server, on every request. It is
 * never inferred from a header, a query parameter, or anything else the
 * client controls.
 */
export function authedRoute(
  handler: (ctx: AuthedCtx) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return route(async (ctx) => {
    const user = await getCurrentUser()
    if (!user) throw unauthenticated()
    return handler({ ...ctx, user })
  })
}
