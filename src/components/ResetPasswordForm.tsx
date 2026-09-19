'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { apiFetch, ApiError, fieldError } from '@/lib/api'

/**
 * Password reset using a recovery code.
 *
 * Note what this form does NOT do: tell you whether the number is
 * registered. Every failure reads the same, because distinguishing them
 * would turn this page into a way to discover who has an account.
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          phone: String(form.get('phone') ?? ''),
          code: String(form.get('code') ?? ''),
          newPassword: String(form.get('newPassword') ?? ''),
        }),
      })
      setDone(true)
    } catch (caught) {
      setError(caught)
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 text-center shadow-card">
        <h2 className="text-base font-semibold text-ink">Password changed</h2>
        <p className="mt-2 text-sm text-ink-muted">
          That recovery code has now been used and cannot be used again. You
          were signed out everywhere, so sign in with your new password.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push('/login')}>
          Sign in
        </Button>
      </div>
    )
  }

  const generalError =
    error instanceof ApiError && !error.details ? error.message : null

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 shadow-card">
      <h2 className="text-base font-semibold text-ink">Reset your password</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Use one of the recovery codes you saved when you signed up.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="98765 43210"
          error={fieldError(error, 'phone')}
        />

        <TextField
          label="Recovery code"
          name="code"
          required
          autoComplete="one-time-code"
          placeholder="XXXX-XXXX-XXXX"
          className="numeric uppercase"
          hint="Dashes and capitals are optional."
          error={fieldError(error, 'code')}
        />

        <TextField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 10 characters."
          error={fieldError(error, 'newPassword')}
        />

        {generalError && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {generalError}
          </p>
        )}

        <Button type="submit" loading={pending} className="w-full">
          Reset password
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
        Lost your codes too? CardCircle cannot verify who you are — there is no
        email or SMS on file — so the account cannot be recovered. You would
        need to create a new one.
      </p>
    </div>
  )
}
