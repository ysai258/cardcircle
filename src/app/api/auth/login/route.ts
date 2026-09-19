import { jsonResponse, readJsonBody } from '@/server/common/http'
import { route } from '@/server/common/route'
import { login } from '@/server/modules/auth/service'
import { loginSchema } from '@/server/modules/auth/validation'

export const dynamic = 'force-dynamic'

export const POST = route(async ({ request, requestId, clientId, log }) => {
  const body = loginSchema.parse(await readJsonBody(request))

  const { userId } = await login(body, clientId)

  log.info('User logged in', { userId })

  return jsonResponse({ id: userId }, { requestId })
})
