import { jsonResponse } from '@/server/common/http'
import { authedRoute } from '@/server/common/route'
import {
  countUnusedCodes,
  regenerateRecoveryCodes,
} from '@/server/modules/auth/recovery'

export const dynamic = 'force-dynamic'

/** How many codes remain. Never the codes themselves. */
export const GET = authedRoute(async ({ user, requestId }) =>
  jsonResponse({ remaining: await countUnusedCodes(user.id) }, { requestId }),
)

/**
 * Issues a fresh set, invalidating every previous code.
 *
 * This is the only response in the application that returns codes in
 * plaintext, and it happens exactly once per generation — they are stored
 * hashed and cannot be shown again.
 */
export const POST = authedRoute(async ({ user, requestId, log }) => {
  const codes = await regenerateRecoveryCodes(user.id)

  log.info('Recovery codes regenerated', {
    userId: user.id,
    count: codes.length,
  })

  return jsonResponse({ codes }, { requestId })
})
