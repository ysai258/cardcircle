import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { logout } from '@/server/modules/auth/service'

export const dynamic = 'force-dynamic'

export const POST = authedRoute(async ({ user, requestId }) => {
  await logout(user.id)
  return jsonResponse({ ok: true }, { requestId })
})
