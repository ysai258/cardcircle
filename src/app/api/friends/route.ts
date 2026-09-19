import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { listBlockedUsers, listFriends } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse(
    {
      friends: await listFriends(user.id),
      blocked: await listBlockedUsers(user.id),
    },
    { requestId },
  ),
)
