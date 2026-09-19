import { z } from 'zod'
import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import { searchUserByPhone } from '@/server/modules/users/service'

export const dynamic = 'force-dynamic'

const searchSchema = z.strictObject({
  phone: z.string().trim().min(4).max(20),
})

/**
 * Exact phone lookup.
 *
 * Returns `{ user: null }` rather than a 404 for "no such user", so the
 * response shape is identical whether or not the number is registered. The
 * rate limit (20/hour, enforced in the service) is what actually makes bulk
 * enumeration impractical.
 */
export const GET = authedRoute(async ({ request, user, requestId }) => {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const { phone } = searchSchema.parse(params)

  const result = await searchUserByPhone(user.id, phone)

  return jsonResponse({ user: result }, { requestId })
})
