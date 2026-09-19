import 'server-only'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { friendships, sessions, users, type UserRow } from '@/db/schema'
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

/**
 * The authenticated layout's data, in ONE round trip.
 *
 * The layout needs the signed-in user and the pending-request count, and it
 * runs on every page render. Two separate queries meant two round trips to
 * the database for every single request — which is barely noticeable against
 * a warm database and very noticeable against a suspended one, where each
 * round trip pays part of the wake-up cost.
 */
export async function getCurrentSessionWithBadge(): Promise<
  { user: UserRow; pendingRequests: number } | null
> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  const pendingRequests = sql<number>`(
    SELECT count(*)::int
    FROM ${friendships} AS f
    INNER JOIN ${users} AS requester ON requester.id = f.requester_id
    WHERE f.recipient_id = ${users.id}
      AND f.status = 'pending'
      AND requester.status = 'active'
  )`

  const [row] = await db
    .select({ user: users, pendingRequests })
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

  return { user: row.user, pendingRequests: Number(row.pendingRequests) }
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
