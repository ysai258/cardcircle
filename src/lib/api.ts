/**
 * Client-side API helper.
 *
 * Every mutating call goes through here so credentials, JSON headers and
 * error shaping are consistent. `credentials: 'same-origin'` keeps the
 * session cookie on requests to this origin and nowhere else.
 */

export type FieldError = {
  field: string
  messages: string[]
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: FieldError[]

  constructor(
    code: string,
    message: string,
    status: number,
    details?: FieldError[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; details?: FieldError[] }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    let body: ErrorBody = {}
    try {
      body = (await response.json()) as ErrorBody
    } catch {
      // Non-JSON error (a proxy timeout, say). Fall through to the default.
    }

    throw new ApiError(
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      body.error?.details,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Maps a field-level error bag onto a single field, for form display. */
export function fieldError(
  error: unknown,
  field: string,
): string | undefined {
  if (!(error instanceof ApiError)) return undefined
  return error.details?.find((detail) => detail.field === field)?.messages[0]
}
