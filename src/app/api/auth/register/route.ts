import { jsonResponse, readJsonBody } from '@/server/common/http'
import { route } from '@/server/common/route'
import { register } from '@/server/modules/auth/service'
import { registerSchema } from '@/server/modules/auth/validation'

export const dynamic = 'force-dynamic'

export const POST = route(async ({ request, requestId, clientId, log }) => {
  const body = registerSchema.parse(await readJsonBody(request))

  const { userId } = await register(body, clientId)

  // Logs the event, never the body: it holds a password and a phone number.
  log.info('User registered', { userId })

  return jsonResponse({ id: userId }, { status: 201, requestId })
})
