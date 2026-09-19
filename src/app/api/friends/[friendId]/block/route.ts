import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { blockUser, unblockUser } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

/**
 * Blocking also tears down the friendship and any pending request, so access
 * is revoked rather than merely hidden.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ friendId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId, log }) => {
    const friendId = uuidSchema.parse((await ctx.params).friendId)
    await blockUser(user.id, friendId)
    log.info('User blocked', { actorId: user.id, targetId: friendId })
    return jsonResponse({ ok: true }, { requestId })
  })(request)
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ friendId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    const friendId = uuidSchema.parse((await ctx.params).friendId)
    await unblockUser(user.id, friendId)
    return jsonResponse({ ok: true }, { requestId })
  })(request)
}
