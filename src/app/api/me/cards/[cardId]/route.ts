import { jsonResponse, readJsonBody } from '@/server/common/http'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import {
  deleteCard,
  getOwnCard,
  updateCard,
} from '@/server/modules/cards/service'
import { updateCardSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

/**
 * Owner-scoped card routes.
 *
 * The card id is validated as a UUID before it reaches the service, so a
 * malformed id is a 400 rather than a database error. Ownership itself is
 * enforced in the service's WHERE clause, not here.
 */
async function cardIdFrom(params: Promise<{ cardId: string }>): Promise<string> {
  return uuidSchema.parse((await params).cardId)
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) =>
    jsonResponse(await getOwnCard(user.id, await cardIdFrom(ctx.params)), {
      requestId,
    }),
  )(request)
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ request: req, user, requestId }) => {
    await enforceRateLimit('cardWrite', user.id)
    const body = updateCardSchema.parse(await readJsonBody(req))
    const card = await updateCard(user.id, await cardIdFrom(ctx.params), body)
    return jsonResponse(card, { requestId })
  })(request)
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ cardId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    await deleteCard(user.id, await cardIdFrom(ctx.params))
    return jsonResponse({ ok: true }, { requestId })
  })(request)
}
