import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { rejectFriendRequest } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

/**
 * Only the RECIPIENT of a pending request may reject it. That rule lives
 * in the service's WHERE clause, so a crafted request id from the sender or
 * a third party matches no row and returns 404.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    const id = uuidSchema.parse((await ctx.params).requestId)
    await rejectFriendRequest(user.id, id)
    return jsonResponse({ ok: true }, { requestId })
  })(request)
}
