import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { getOwnCard, updateSharing } from '@/server/modules/cards/service'
import { updateSharingSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    const cardId = uuidSchema.parse((await ctx.params).cardId)
    const card = await getOwnCard(user.id, cardId)

    return jsonResponse(
      {
        cardId: card.id,
        discoverability: card.discoverability,
        binVisibility: card.binVisibility,
      },
      { requestId },
    )
  })(request)
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ request: req, user, requestId }) => {
    const cardId = uuidSchema.parse((await ctx.params).cardId)
    const body = updateSharingSchema.parse(await readJsonBody(req))
    const card = await updateSharing(user.id, cardId, body)

    return jsonResponse(card, { requestId })
  })(request)
}
