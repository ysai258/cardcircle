import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security headers.
 *
 * Next.js 16 renamed Middleware to Proxy; the semantics are unchanged.
 *
 * Note what this file deliberately does NOT do: authentication or
 * authorisation. Next's own guidance is that proxy should not be used as a
 * session or authorisation layer, and it is the wrong place regardless —
 * it cannot see the database, and a redirect here would be a UI convenience,
 * not a control. Every protected route resolves the session itself.
 */

/**
 * React's development build uses eval() for debugging features such as
 * reconstructing call stacks across environments. Production never does.
 *
 * The relaxation is therefore scoped strictly to development: the deployed
 * policy keeps 'unsafe-eval' out. Loosening production CSP to silence a
 * development-only console warning would be trading a real control for a
 * cosmetic fix.
 */
const isDev = process.env.NODE_ENV !== 'production'

const SCRIPT_SRC = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

const CSP = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; 'unsafe-inline' is required for
  // them in the absence of a nonce-based setup.
  SCRIPT_SRC,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // Sensitive values must never be posted anywhere but this origin.
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  response.headers.set('Content-Security-Policy', CSP)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  )
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  )

  // Card data must never be cached by a shared proxy or written to disk.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, private')
  }

  return response
}

export const config = {
  matcher: [
    // Everything except Next's static output and image optimiser.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
