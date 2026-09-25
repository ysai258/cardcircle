import 'server-only'
import { sql, type SQL } from 'drizzle-orm'
import { blocks, cardProducts, cards, friendships, users } from '@/db/schema'

/**
 * THE discovery authorisation predicate.
 *
 * Both the listings and the home-page counts compose this same fragment.
 * That is not tidiness — deriving them separately is how you get a page
 * saying "HDFC Bank: 12 cards" above a list showing 9, which discloses that
 * three hidden cards exist. One predicate, one truth.
 *
 * Assumes `cards` is joined to `users` on `users.id = cards.owner_id` and to
 * `card_products` on `card_products.id = cards.product_id`.
 *
 * Excludes the requester's own cards: "Available cards" answers "who ELSE
 * has this", and My Cards already covers your own.
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
        AND ${isFriendOfOwner(requesterId)}
      )
    )
  `
}

/** Accepted friendship between the requester and the card's owner. */
export function isFriendOfOwner(requesterId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${friendships} AS f
    WHERE f.status = 'accepted'
      AND (
           (f.requester_id = ${requesterId} AND f.recipient_id = ${cards.ownerId})
        OR (f.recipient_id = ${requesterId} AND f.requester_id = ${cards.ownerId})
      )
  )`
}

/**
 * Whether this requester may see this card's BIN.
 *
 * Used to gate BIN SEARCH, not just BIN display — and that distinction is
 * the point. If a masked card could still be found by searching its exact
 * BIN, the search box would be an oracle: guess six digits, see whose card
 * matches, and the masking has told you what it was hiding. Search must only
 * ever match digits the searcher is already allowed to read.
 */
export function binVisibleToRequester(requesterId: string): SQL {
  return sql`(
    ${cards.binVisibility} = 'everyone'
    OR (
      ${cards.binVisibility} = 'friends'
      AND ${isFriendOfOwner(requesterId)}
    )
  )`
}

/** Free-text match over bank and product names. */
export function matchesText(query: string): SQL {
  const pattern = `%${query.toLowerCase()}%`
  return sql`(
    lower(${cardProducts.name}) LIKE ${pattern}
    OR lower(${sql.raw('banks.name')}) LIKE ${pattern}
    OR lower(${sql.raw('banks.code')}) LIKE ${pattern}
  )`
}
