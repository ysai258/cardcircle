import { jsonResponse, readJsonBody } from '@/server/common/http'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { authedRoute } from '@/server/common/route'
import { createCard, listOwnCards } from '@/server/modules/cards/service'
import { createCardSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse({ items: await listOwnCards(user.id) }, { requestId }),
)

export const POST = authedRoute(async ({ request, user, requestId, log }) => {
  await enforceRateLimit('cardWrite', user.id)

  const body = createCardSchema.parse(await readJsonBody(request))
  const card = await createCard(user.id, body)

  // The card id and nothing else. No BIN, no last 4, no expiry.
  log.info('Card created', { userId: user.id, cardId: card.id })

  return jsonResponse(card, { status: 201, requestId })
})
