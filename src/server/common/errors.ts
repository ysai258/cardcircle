import 'server-only'

/**
 * Application error codes.
 *
 * Note what is deliberately absent: there is no `FORBIDDEN` for "this card
 * exists but you may not see it". Authorisation failures on another user's
 * resource surface as NOT_FOUND, because a 403 confirms the resource exists
 * and hands an attacker the enumeration signal we are trying to deny.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  ACCOUNT_DISABLED: 403,
  INTERNAL: 500,
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  /** Field-level detail, safe to return to the client. */
  readonly details?: Record<string, string[]>

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

/**
 * The single "you may not have this" error.
 *
 * Callers must not distinguish "no such card" from "not allowed to see this
 * card" — that distinction is itself the leak.
 */
export function notFound(resource = 'Resource'): AppError {
  return new AppError(ERROR_CODES.NOT_FOUND, `${resource} not found`)
}

export function unauthenticated(): AppError {
  return new AppError(ERROR_CODES.UNAUTHENTICATED, 'Authentication required')
}

export function validationFailed(
  message: string,
  details?: Record<string, string[]>,
): AppError {
  return new AppError(ERROR_CODES.VALIDATION_FAILED, message, details)
}

export function conflict(message: string): AppError {
  return new AppError(ERROR_CODES.CONFLICT, message)
}

export function rateLimited(message = 'Too many requests. Try again later.'): AppError {
  return new AppError(ERROR_CODES.RATE_LIMITED, message)
}
