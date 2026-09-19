import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { removeFriend } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ friendId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    const friendId = uuidSchema.parse((await ctx.params).friendId)
    await removeFriend(user.id, friendId)
    return jsonResponse({ ok: true }, { requestId })
  })(request)
}
