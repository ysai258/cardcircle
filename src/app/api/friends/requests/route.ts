import { z } from 'zod'
import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { uuidSchema } from '@/server/common/validation'
import {
  listIncomingRequests,
  listOutgoingRequests,
  sendFriendRequest,
} from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

const sendRequestSchema = z.strictObject({ userId: uuidSchema })

export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse(
    {
      incoming: await listIncomingRequests(user.id),
      outgoing: await listOutgoingRequests(user.id),
    },
    { requestId },
  ),
)

export const POST = authedRoute(async ({ request, user, requestId, log }) => {
  const body = sendRequestSchema.parse(await readJsonBody(request))
  const result = await sendFriendRequest(user.id, body.userId)

  log.info('Friend request', {
    actorId: user.id,
    targetId: body.userId,
    status: result.status,
  })

  return jsonResponse(result, { status: 201, requestId })
})
