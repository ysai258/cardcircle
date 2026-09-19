import { z } from 'zod'
import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { visibilitySchema } from '@/server/common/validation'
import { getCurrentUser } from '@/server/modules/auth/session'
import { toMeDTO, updatePhoneVisibility } from '@/server/modules/users/service'

export const dynamic = 'force-dynamic'

const updateMeSchema = z.strictObject({
  phoneVisibility: visibilitySchema,
})

export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse(toMeDTO(user), { requestId }),
)

export const PATCH = authedRoute(async ({ request, user, requestId }) => {
  const body = updateMeSchema.parse(await readJsonBody(request))
  await updatePhoneVisibility(user.id, body.phoneVisibility)

  // Re-read so the response reflects committed state, not the request.
  const updated = await getCurrentUser()
  return jsonResponse(toMeDTO(updated ?? user), { requestId })
})
