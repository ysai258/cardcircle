import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import { blocks, cards, friendships, users } from '@/db/schema'

/**
 * THE discovery authorisation predicate.
 *
 * Both the bank listing and the home-page per-bank counts compose this same
 * fragment. That is not a tidiness preference — deriving them separately is
 * how you end up with a count that says "HDFC Bank: 12 cards" while the list
 * shows 9, which leaks the existence of three cards the viewer may not see.
 * One predicate, one truth.
 *
 * Assumes `cards` is joined to `users` on `users.id = cards.owner_id`.
 *
 * Excludes the requester's own cards: "Available Cards" answers "who else
 * has this card", and My Cards already covers your own.
 */
export function discoverableByRequester(requesterId: string): SQL {
  return sql`
    ${users.status} = 'active'
    AND ${cards.ownerId} <> ${requesterId}
    AND NOT EXISTS (
      SELECT 1 FROM ${blocks} AS b
      WHERE (b.blocker_id = ${cards.ownerId} AND b.blocked_id = ${requesterId})
         OR (b.blocker_id = ${requesterId} AND b.blocked_id = ${cards.ownerId})
    )
    AND (
      ${cards.discoverability} = 'everyone'
      OR (
        ${cards.discoverability} = 'friends'
        AND EXISTS (
          SELECT 1 FROM ${friendships} AS f
          WHERE f.status = 'accepted'
            AND (
                 (f.requester_id = ${requesterId} AND f.recipient_id = ${cards.ownerId})
              OR (f.recipient_id = ${requesterId} AND f.requester_id = ${cards.ownerId})
            )
        )
      )
    )
  `
}
