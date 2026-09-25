import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { listProducts } from '@/server/modules/cards/service'
import { productQuerySchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

/**
 * The card picker's options: every product a bank issues of a given type.
 *
 * Authenticated, like everything else — the catalogue is not secret, but
 * there is no reason to serve it to anonymous callers either.
 */
export const GET = authedRoute(async ({ request, requestId }) => {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const { bankId, cardType } = productQuerySchema.parse(params)

  return jsonResponse(
    { items: await listProducts(bankId, cardType) },
    { requestId },
  )
})
