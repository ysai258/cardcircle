import { jsonResponse } from '@/server/common/http'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { getCardDetail } from '@/server/modules/cards/service'

export const dynamic = 'force-dynamic'

/**
 * Card detail — the authorisation-critical endpoint.
 *
 * Everything about what this returns is decided by buildCardView(). The
 * handler's only jobs are to authenticate, rate limit, validate the id, and
 * serialise whatever the resolver produced.
 *
 * Rate limited because this is the endpoint an attacker would iterate over
 * if they were guessing card ids.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    await enforceRateLimit('cardDetail', user.id)

    const cardId = uuidSchema.parse((await ctx.params).cardId)
    const view = await getCardDetail(user.id, cardId)

    return jsonResponse(
      { kind: view.kind, card: view.card },
      { requestId },
    )
  })(request)
}
