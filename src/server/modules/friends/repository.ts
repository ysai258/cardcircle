import 'server-only'
import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { blocks, friendships, type FriendshipRow } from '@/db/schema'
import { resolveRelationship } from '@/server/modules/cards/authorization'
import type { Relationship } from '@/server/modules/cards/dto'

/**
 * Relationship reads.
 *
 * Every friendship lookup is direction-agnostic: the row may have been
 * created from either side, so a query that only checks (requester=me,
 * recipient=them) would miss half the relationships and silently report
 * "not friends" — which fails open on the discovery side and closed on the
 * access side. Both directions, always.
 */

export async function findFriendshipBetween(
  userA: string,
  userB: string,
): Promise<FriendshipRow | null> {
  const [row] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, userA),
          eq(friendships.recipientId, userB),
        ),
        and(
          eq(friendships.requesterId, userB),
          eq(friendships.recipientId, userA),
        ),
      ),
    )
    .limit(1)

  return row ?? null
}

/** True if either user has blocked the other. Blocking is not symmetric, but its effect is. */
export async function blockExistsBetween(
  userA: string,
  userB: string,
): Promise<boolean> {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, userA), eq(blocks.blockedId, userB)),
        and(eq(blocks.blockerId, userB), eq(blocks.blockedId, userA)),
      ),
    )
    .limit(1)

  return row !== undefined
}

/** The one place a Relationship is derived from the database. */
export async function getRelationship(
  requesterId: string,
  otherUserId: string,
): Promise<Relationship> {
  if (requesterId === otherUserId) return 'self'

  const [friendship, blockExists] = await Promise.all([
    findFriendshipBetween(requesterId, otherUserId),
    blockExistsBetween(requesterId, otherUserId),
  ])

  return resolveRelationship({
    requesterId,
    ownerId: otherUserId,
    blockExists,
    friendship: friendship
      ? {
          requesterId: friendship.requesterId,
          recipientId: friendship.recipientId,
          status: friendship.status,
        }
      : null,
  })
}
