import { z } from 'zod'
import { jsonResponse, readJsonBody } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import {
  mobileNumberSchema,
  visibilitySchema,
} from '@/server/common/validation'
import {
  destroyCurrentSession,
  getCurrentUser,
} from '@/server/modules/auth/session'
import {
  changePhoneNumber,
  deleteAccount,
  toMeDTO,
  updatePhoneVisibility,
} from '@/server/modules/users/service'
import { deleteAccountSchema } from '@/server/modules/auth/validation'

export const dynamic = 'force-dynamic'

const updateMeSchema = z.strictObject({
  phoneVisibility: visibilitySchema,
})

/**
 * Changing the mobile number is its own endpoint, not part of PATCH /me.
 *
 * It needs the password, it can conflict with another account, and it moves
 * the key friends use to find you — none of which belong in the same
 * request as flipping a visibility toggle.
 */
const changePhoneSchema = z.strictObject({
  newPhone: mobileNumberSchema,
  password: z.string().min(1, 'Enter your password').max(1024),
})

export const PUT = authedRoute(async ({ request, user, requestId, log }) => {
  const body = changePhoneSchema.parse(await readJsonBody(request))

  const result = await changePhoneNumber({
    userId: user.id,
    newPhone: body.newPhone,
    password: body.password,
  })

  // The number itself is never logged.
  log.info('Mobile number changed', { userId: user.id })

  return jsonResponse({ phone: { masked: result.masked } }, { requestId })
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
