import 'server-only'
import { randomUUID } from 'node:crypto'
import { ZodError } from 'zod'
import { isProduction } from '@/env'
import { AppError, ERROR_CODES } from './errors'
import { logger } from './logger'
import { findForbiddenKeys } from './redact'

/**
 * The HTTP response boundary.
 *
 * Everything a client receives goes through jsonResponse(), which scans the
 * payload for forbidden keys before serialising. If a DTO builder regresses
 * and starts including `phoneCt` or `passwordHash`, the request fails with a
 * 500 instead of disclosing the value.
 */

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: HeadersInit; requestId?: string } = {},
): Response {
  const leaked = findForbiddenKeys(body)

  if (leaked.length > 0) {
    // Log the PATHS, never the payload.
    logger.error('Blocked a response containing forbidden fields', {
      paths: leaked,
      requestId: init.requestId,
    })

    return Response.json(
      {
        error: {
          code: ERROR_CODES.INTERNAL,
          message: 'Internal server error',
        },
      },
      { status: 500 },
    )
  }

  const headers = new Headers(init.headers)
  headers.set('Cache-Control', 'no-store')
  if (init.requestId) headers.set('X-Request-Id', init.requestId)

  return Response.json(body, { status: init.status ?? 200, headers })
}

export function errorResponse(
  error: unknown,
  requestId: string,
): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status, requestId },
    )
  }

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_'
      ;(details[key] ??= []).push(issue.message)
    }
    return jsonResponse(
      {
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Validation failed',
          details,
        },
      },
      { status: 400, requestId },
    )
  }

  // Unexpected. Log server-side with the stack; return nothing useful.
  logger.error('Unhandled error', {
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error && !isProduction ? error.stack : undefined,
  })

  return jsonResponse(
    { error: { code: ERROR_CODES.INTERNAL, message: 'Internal server error' } },
    { status: 500, requestId },
  )
}

export function newRequestId(): string {
  return randomUUID()
}

/**
 * Parses a JSON request body, rejecting anything that is not an object.
 *
 * Returns `{}` for an empty body so schema validation produces useful
 * per-field errors rather than "expected object, got undefined".
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.trim().length === 0) return {}

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Request body must be valid JSON')
  }
}
