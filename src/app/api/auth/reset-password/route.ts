import { jsonResponse, readJsonBody } from '@/server/common/http'
import { route } from '@/server/common/route'
import { resetPasswordWithRecoveryCode } from '@/server/modules/auth/recovery'
import { resetPasswordSchema } from '@/server/modules/auth/validation'

export const dynamic = 'force-dynamic'

/**
 * Password reset using a recovery code.
 *
 * Public by necessity — the caller cannot sign in. Every failure returns the
 * same message so this cannot be used to discover which numbers are
 * registered, and it is rate limited per IP and per phone number.
 */
export const POST = route(async ({ request, requestId, clientId, log }) => {
  const body = resetPasswordSchema.parse(await readJsonBody(request))

  await resetPasswordWithRecoveryCode({
    phone: body.phone,
    code: body.code,
    newPassword: body.newPassword,
    clientId,
  })

  // No identifiers: this endpoint is unauthenticated, and logging the phone
  // number would put it in the log stream in plaintext.
  log.info('Password reset via recovery code')

  return jsonResponse({ ok: true }, { requestId })
})
