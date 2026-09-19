import { z } from 'zod'
import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { safeText, uuidSchema } from '@/server/common/validation'
import { reportUser } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

const reportSchema = z.strictObject({
  reason: z.enum(['spam', 'impersonation', 'abuse', 'fraud', 'other']),
  details: safeText(1000).nullish(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return authedRoute(async ({ request: req, user, requestId }) => {
    const userId = uuidSchema.parse((await ctx.params).userId)
    const body = reportSchema.parse(await readJsonBody(req))

    await reportUser(user.id, userId, body.reason, body.details ?? undefined)

    return jsonResponse({ ok: true }, { status: 201, requestId })
  })(request)
}
