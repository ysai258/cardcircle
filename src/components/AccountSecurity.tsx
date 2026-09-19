'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryCodes } from '@/components/RecoveryCodes'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError, fieldError } from '@/lib/api'

/**
 * Recovery codes and account deletion.
 *
 * Both are destructive in different ways — one invalidates the codes a user
 * may have written down, the other removes everything — so both sit behind a
 * deliberate confirmation rather than a single click.
 */
export function AccountSecurity({ remainingCodes }: { remainingCodes: number }) {
  const router = useRouter()
  const { toast } = useToast()

  const [codes, setCodes] = useState<string[] | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)

  async function regenerate() {
    setRegenerating(true)
    try {
      const result = await apiFetch<{ codes: string[] }>(
        '/api/me/recovery-codes',
        { method: 'POST' },
      )
      setConfirmRegenerate(false)
      setCodes(result.codes)
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError
          ? caught.message
          : 'Could not generate new codes.',
        'error',
      )
    } finally {
      setRegenerating(false)
    }
  }

  /**
   * onSubmit, not a form `action`.
   *
   * React 19 resets an uncontrolled form once its action resolves, which on
   * the error path wiped the typed "DELETE" confirmation. The user then
   * corrected only their password, native `required` validation silently
   * blocked the submit, and the button appeared to do nothing.
   */
  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setDeleting(true)
    setDeleteError(null)

    try {
      await apiFetch('/api/me', {
        method: 'DELETE',
        body: JSON.stringify({
          password: String(formData.get('password') ?? ''),
          confirm: String(formData.get('confirm') ?? ''),
        }),
      })
      router.push('/login')
      router.refresh()
    } catch (caught) {
      setDeleteError(caught)
      setDeleting(false)
    }
  }

  const deleteGeneralError =
    deleteError instanceof ApiError && !deleteError.details
      ? deleteError.message
      : null

  return (
    <>
      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Recovery codes</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          The only way back into your account if you forget your password.
          CardCircle cannot email or text you a reset link.
        </p>

        <p className="mt-3 text-sm text-ink">
          <span className="font-medium">{remainingCodes}</span> unused code
          {remainingCodes === 1 ? '' : 's'} remaining
          {remainingCodes === 0 && (
            <span className="text-danger">
              {' '}
              — generate a new set now, or you will be locked out.
            </span>
          )}
          {remainingCodes > 0 && remainingCodes <= 2 && (
            <span className="text-warning"> — running low.</span>
          )}
        </p>

        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setConfirmRegenerate(true)}
        >
          Generate new codes
        </Button>
      </section>

      <section className="rounded-(--radius-card) border border-danger/30 bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Delete account</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Permanently removes your account, your cards, your friendships and
          your phone number. This cannot be undone, and your friends will no
          longer see any of your cards.
        </p>
        <Button
          variant="danger"
          size="sm"
          className="mt-3"
          onClick={() => setDeleteOpen(true)}
        >
          Delete my account
        </Button>
      </section>

      {/* Regenerating invalidates codes the user may have on paper. */}
      <Dialog
        open={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        title="Generate new recovery codes?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmRegenerate(false)}
            >
              Cancel
            </Button>
            <Button onClick={regenerate} loading={regenerating}>
              Generate
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Your existing codes stop working immediately. If you have them
          written down somewhere, replace that copy with the new ones.
        </p>
      </Dialog>

      <Dialog
        open={codes !== null}
        onClose={() => setCodes(null)}
        title="Your new recovery codes"
      >
        {codes && (
          <RecoveryCodes
            codes={codes}
            acknowledgeLabel="Done"
            onAcknowledge={() => setCodes(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteError(null)
        }}
        title="Delete your account?"
        description="This cannot be undone."
      >
        <form onSubmit={handleDelete} className="space-y-4" noValidate>
          <ul className="space-y-1 rounded-lg bg-danger-soft px-3 py-2.5 text-xs text-danger">
            <li>Every card you added is deleted.</li>
            <li>Your friends lose access to them immediately.</li>
            <li>Your phone number is erased from our database.</li>
            <li>Nothing here can be restored afterwards.</li>
          </ul>

          <TextField
            label="Your password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            hint="Confirming with your password, not just your session."
            error={fieldError(deleteError, 'password')}
          />

          <TextField
            label="Type DELETE to confirm"
            name="confirm"
            required
            placeholder="DELETE"
            error={fieldError(deleteError, 'confirm')}
          />

          {deleteGeneralError && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {deleteGeneralError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={deleting}>
              Delete permanently
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
