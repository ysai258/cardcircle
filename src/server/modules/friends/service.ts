import 'server-only'
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { blocks, friendships, reports, users } from '@/db/schema'
import { conflict, notFound, validationFailed } from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { recordAuditEvent } from '@/server/modules/audit/service'
import type { Relationship } from '@/server/modules/cards/dto'
import { blockExistsBetween, findFriendshipBetween, getRelationship } from './repository'

/**
 * Friendship lifecycle.
 *
 * All the "prevent" rules from the spec live here: no self-requests, no
 * duplicates in either direction, nothing to or from a blocked user, and a
 * cooling-off period after a rejection so a rejected request cannot be
 * re-sent on a loop.
 */

/** How long after a rejection before the sender may ask again. */
const REJECTION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export type FriendSummary = {
  id: string
  name: string
  avatarUrl: string | null
}

export type FriendRequestSummary = {
  requestId: string
  user: FriendSummary
  createdAt: string
}

export async function sendFriendRequest(
  requesterId: string,
  recipientId: string,
): Promise<{ status: 'sent' | 'accepted' }> {
  await enforceRateLimit('friendRequest', requesterId)

  if (requesterId === recipientId) {
    throw validationFailed('You cannot send yourself a friend request')
  }

  const [recipient] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1)

  // A disabled or missing recipient is reported identically.
  if (!recipient || recipient.status !== 'active') throw notFound('User')

  if (await blockExistsBetween(requesterId, recipientId)) {
    // Do not reveal that a block exists — that tells the sender they were
    // blocked. Same message a stranger would get for any failure.
    throw notFound('User')
  }

  const existing = await findFriendshipBetween(requesterId, recipientId)

  if (existing) {
    if (existing.status === 'accepted') {
      throw conflict('You are already friends')
    }

    if (existing.status === 'pending') {
      // They already asked us: accepting is the sane interpretation of both
      // people pressing "add friend".
      if (existing.recipientId === requesterId) {
        await acceptFriendRequest(requesterId, existing.id)
        return { status: 'accepted' }
      }
      throw conflict('A friend request is already pending')
    }

    // Rejected. Allow a retry only after the cooling-off period.
    const rejectedAt = existing.rejectedAt?.getTime() ?? 0
    if (Date.now() - rejectedAt < REJECTION_COOLDOWN_MS) {
      const days = Math.ceil(
        (REJECTION_COOLDOWN_MS - (Date.now() - rejectedAt)) /
          (24 * 60 * 60 * 1000),
      )
      throw conflict(
        `This request was declined. You can try again in ${days} day${days === 1 ? '' : 's'}.`,
      )
    }

    await db
      .update(friendships)
      .set({
        requesterId,
        recipientId,
        status: 'pending',
        rejectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, existing.id))
  } else {
    await db.insert(friendships).values({
      requesterId,
      recipientId,
      status: 'pending',
    })
  }

  await recordAuditEvent({
    action: 'friend_request_sent',
    actorUserId: requesterId,
    targetUserId: recipientId,
    resourceType: 'user',
    resourceId: recipientId,
  })

  return { status: 'sent' }
}

/**
 * Accepts a pending request.
 *
 * The WHERE clause requires the caller to be the RECIPIENT, so the sender
 * cannot accept their own request by posting its id.
 */
export async function acceptFriendRequest(
  userId: string,
  requestId: string,
): Promise<void> {
  const updated = await db
    .update(friendships)
    .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(friendships.id, requestId),
        eq(friendships.recipientId, userId),
        eq(friendships.status, 'pending'),
      ),
    )
    .returning({ requesterId: friendships.requesterId })

  const row = updated[0]
  if (!row) throw notFound('Friend request')

  await recordAuditEvent({
    action: 'friend_request_accepted',
    actorUserId: userId,
    targetUserId: row.requesterId,
    resourceType: 'friendship',
    resourceId: requestId,
  })
}

export async function rejectFriendRequest(
  userId: string,
  requestId: string,
): Promise<void> {
  const updated = await db
    .update(friendships)
    .set({ status: 'rejected', rejectedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(friendships.id, requestId),
        eq(friendships.recipientId, userId),
        eq(friendships.status, 'pending'),
      ),
    )
    .returning({ requesterId: friendships.requesterId })

  const row = updated[0]
  if (!row) throw notFound('Friend request')

  await recordAuditEvent({
    action: 'friend_request_rejected',
    actorUserId: userId,
    targetUserId: row.requesterId,
    resourceType: 'friendship',
    resourceId: requestId,
  })
}

export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<void> {
  const deleted = await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(
            eq(friendships.requesterId, userId),
            eq(friendships.recipientId, friendId),
          ),
          and(
            eq(friendships.requesterId, friendId),
            eq(friendships.recipientId, userId),
          ),
        ),
      ),
    )
    .returning({ id: friendships.id })

  if (deleted.length === 0) throw notFound('Friendship')

  await recordAuditEvent({
    action: 'friend_removed',
    actorUserId: userId,
    targetUserId: friendId,
  })
}

/**
 * Blocks a user.
 *
 * Blocking also destroys any friendship and invalidates pending requests in
 * both directions, so access is revoked immediately rather than merely
 * hidden. Card visibility is then denied by the resolver's `blocked` branch.
 */
export async function blockUser(
  userId: string,
  targetId: string,
): Promise<void> {
  if (userId === targetId) throw validationFailed('You cannot block yourself')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1)

  if (!target) throw notFound('User')

  await db.transaction(async (tx) => {
    await tx
      .insert(blocks)
      .values({ blockerId: userId, blockedId: targetId })
      .onConflictDoNothing({
        target: [blocks.blockerId, blocks.blockedId],
      })

    // Remove the relationship entirely, in either direction.
    await tx
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, userId),
            eq(friendships.recipientId, targetId),
          ),
          and(
            eq(friendships.requesterId, targetId),
            eq(friendships.recipientId, userId),
          ),
        ),
      )
  })

  await recordAuditEvent({
    action: 'user_blocked',
    actorUserId: userId,
    targetUserId: targetId,
    resourceType: 'user',
    resourceId: targetId,
  })
}

export async function unblockUser(
  userId: string,
  targetId: string,
): Promise<void> {
  const deleted = await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, targetId)))
    .returning({ id: blocks.id })

  if (deleted.length === 0) throw notFound('Block')

  await recordAuditEvent({
    action: 'user_unblocked',
    actorUserId: userId,
    targetUserId: targetId,
  })
}

export async function reportUser(
  userId: string,
  targetId: string,
  reason: string,
  details?: string,
): Promise<void> {
  if (userId === targetId) throw validationFailed('You cannot report yourself')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1)

  if (!target) throw notFound('User')

  await db.insert(reports).values({
    reporterId: userId,
    reportedUserId: targetId,
    reason,
    details: details ?? null,
  })

  await recordAuditEvent({
    action: 'user_reported',
    actorUserId: userId,
    targetUserId: targetId,
    metadata: { reason },
  })
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listFriends(userId: string): Promise<FriendSummary[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(
      users,
      sql`${users.id} = CASE WHEN ${friendships.requesterId} = ${userId}
                             THEN ${friendships.recipientId}
                             ELSE ${friendships.requesterId} END`,
    )
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.recipientId, userId),
        ),
        eq(users.status, 'active'),
      ),
    )
    .orderBy(asc(users.name))

  return rows
}

/**
 * How many friend requests are waiting.
 *
 * Separate from listIncomingRequests() because the navigation badge needs
 * only the number, and that runs on EVERY page render — including every
 * <Link> prefetch, which multiplies it by the number of links on the page.
 * Fetching joined rows, sorting them and mapping them into objects only to
 * read `.length` made it the most-executed query in the application.
 */
export async function countIncomingRequests(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(
      and(
        eq(friendships.recipientId, userId),
        eq(friendships.status, 'pending'),
        eq(users.status, 'active'),
      ),
    )

  return Number(row?.total ?? 0)
}

export async function listIncomingRequests(
  userId: string,
): Promise<FriendRequestSummary[]> {
  const rows = await db
    .select({
      requestId: friendships.id,
      createdAt: friendships.createdAt,
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .where(
      and(
        eq(friendships.recipientId, userId),
        eq(friendships.status, 'pending'),
        eq(users.status, 'active'),
      ),
    )
    .orderBy(desc(friendships.createdAt))

  return rows.map((row) => ({
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
    user: { id: row.id, name: row.name, avatarUrl: row.avatarUrl },
  }))
}

export async function listOutgoingRequests(
  userId: string,
): Promise<FriendRequestSummary[]> {
  const rows = await db
    .select({
      requestId: friendships.id,
      createdAt: friendships.createdAt,
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.recipientId))
    .where(
      and(
        eq(friendships.requesterId, userId),
        eq(friendships.status, 'pending'),
        eq(users.status, 'active'),
      ),
    )
    .orderBy(desc(friendships.createdAt))

  return rows.map((row) => ({
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
    user: { id: row.id, name: row.name, avatarUrl: row.avatarUrl },
  }))
}

export async function listBlockedUsers(
  userId: string,
): Promise<FriendSummary[]> {
  return db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, userId))
    .orderBy(asc(users.name))
}

export { getRelationship }
export type { Relationship }
