import { z } from 'zod'
import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { visibilitySchema } from '@/server/common/validation'
import {
  destroyCurrentSession,
  getCurrentUser,
} from '@/server/modules/auth/session'
import {
  deleteAccount,
  toMeDTO,
  updatePhoneVisibility,
} from '@/server/modules/users/service'
import { deleteAccountSchema } from '@/server/modules/auth/validation'

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

/**
 * Permanently deletes the caller's account and everything it owns.
 *
 * Requires the password again: a live session is too weak a confirmation for
 * something irreversible.
 */
export const DELETE = authedRoute(async ({ request, user, requestId, log }) => {
  const body = deleteAccountSchema.parse(await readJsonBody(request))

  await deleteAccount(user.id, body.password)
  await destroyCurrentSession()

  log.info('Account deleted', { userId: user.id })

  return jsonResponse({ ok: true }, { requestId })
})
