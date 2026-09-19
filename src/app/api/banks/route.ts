import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { listBanksWithCounts } from '@/server/modules/cards/service'

export const dynamic = 'force-dynamic'

/**
 * Home screen: banks the current user can actually discover cards in.
 *
 * Authenticated, because anonymous bulk discovery is exactly what the threat
 * model forbids. The counts come from the same predicate as the listings.
 */
export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse({ items: await listBanksWithCounts(user.id) }, { requestId }),
)
