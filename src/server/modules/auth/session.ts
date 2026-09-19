import 'server-only'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { sessions, users, type UserRow } from '@/db/schema'
import { isProduction } from '@/env'
import { generateToken, hashToken } from '@/server/crypto/tokens'

/**
 * Session management.
 *
 * Sessions are opaque random tokens stored in an HTTP-only cookie, with only
 * SHA-256 of the token persisted. This is a server-side session rather than
 * a self-contained JWT for one reason: revocation. Blocking a user, changing
 * a password, or disabling an account must invalidate live sessions
 * immediately, which a stateless token cannot do.
 */

export const SESSION_COOKIE_NAME = 'cardcircle_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * `sameSite: 'lax'` blocks the cookie on cross-site POST/PATCH/DELETE, which
 * covers the CSRF cases that matter here, while still allowing a normal link
 * into the app to arrive authenticated. Mutating routes additionally verify
 * the Origin header (see requireSameOrigin) rather than relying on SameSite
 * alone.
 */
function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

export type AuthenticatedSession = {
  user: UserRow
  sessionId: string
}

export async function createSession(userId: string): Promise<void> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(sessions).values({
    userId,
    tokenSha256: hashToken(token),
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt))
}

/**
 * Resolves the current session from the request cookie.
 *
 * Returns null — never throws — for missing, expired, revoked or unknown
 * tokens, and for users whose account has since been disabled. Joining the
 * user row here means a disabled account loses access on its next request
 * without needing its sessions hunted down.
 */
export async function getCurrentSession(): Promise<AuthenticatedSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  const [row] = await db
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenSha256, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.status, 'active'),
      ),
    )
    .limit(1)

  if (!row) return null

  return { user: row.user, sessionId: row.sessionId }
}

export async function getCurrentUser(): Promise<UserRow | null> {
  return (await getCurrentSession())?.user ?? null
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenSha256, hashToken(token)))
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

/** Revokes every live session for a user (password change, account disable). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}
