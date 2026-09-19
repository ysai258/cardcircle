import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import { getUserProfile } from '@/server/modules/users/service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return authedRoute(async ({ user, requestId }) => {
    const userId = uuidSchema.parse((await ctx.params).userId)
    return jsonResponse(await getUserProfile(user.id, userId), { requestId })
  })(request)
}
