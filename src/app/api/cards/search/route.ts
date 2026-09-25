import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { searchCards } from '@/server/modules/cards/service'
import { cardFiltersSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

/**
 * Home-page search across every bank.
 *
 * Runs the same authorisation predicate as the bank listings, so a search
 * can never surface a card the bank page would hide. BIN matching is gated
 * on BIN visibility — see discovery-predicate.ts for why that matters.
 */
export const GET = authedRoute(async ({ request, user, requestId }) => {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filters = cardFiltersSchema.parse(params)

  return jsonResponse(await searchCards(user.id, filters), { requestId })
})
