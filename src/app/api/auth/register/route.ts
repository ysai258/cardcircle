import { jsonResponse, readJsonBody } from '@/server/common/http'
import { route } from '@/server/common/route'
import { register } from '@/server/modules/auth/service'
import { registerSchema } from '@/server/modules/auth/validation'

export const dynamic = 'force-dynamic'

export const POST = route(async ({ request, requestId, clientId, log }) => {
  const body = registerSchema.parse(await readJsonBody(request))

  const { userId, recoveryCodes } = await register(body, clientId)

  // Logs the event, never the body: it holds a password and a phone number.
  // The codes are not logged either — they reset the password.
  log.info('User registered', { userId, recoveryCodeCount: recoveryCodes.length })

  // The ONLY response that carries recovery codes in plaintext. They are
  // stored hashed and can never be shown again, so the client must present
  // them immediately.
  return jsonResponse({ id: userId, recoveryCodes }, { status: 201, requestId })
})
