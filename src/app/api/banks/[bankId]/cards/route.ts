import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { listCardsByBank } from '@/server/modules/cards/service'
import { cardFiltersSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ bankId: string }> },
): Promise<Response> {
  return authedRoute(async ({ request: req, user, requestId }) => {
    const bankId = uuidSchema.parse((await ctx.params).bankId)

    // Filters come from the query string, validated the same as a body.
    // Unknown parameters are rejected rather than ignored, so a client
    // cannot smuggle in something like ?include=expiry.
    const params = Object.fromEntries(new URL(req.url).searchParams)
    const filters = cardFiltersSchema.parse(params)

    return jsonResponse(await listCardsByBank(user.id, bankId, filters), {
      requestId,
    })
  })(request)
}
