'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { apiFetch, ApiError, fieldError } from '@/lib/api'

/**
 * Sign-in and sign-up.
 *
 * One component for both because the fields and failure handling are nearly
 * identical; the differences are a single extra field and the endpoint.
 */
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload = isRegister
      ? {
          name: String(form.get('name') ?? ''),
          phone: String(form.get('phone') ?? ''),
          password: String(form.get('password') ?? ''),
        }
      : {
          phone: String(form.get('phone') ?? ''),
          password: String(form.get('password') ?? ''),
        }

    try {
      await apiFetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      router.push('/')
      router.refresh()
    } catch (caught) {
      setError(caught)
    } finally {
      setPending(false)
    }
  }

  const generalError =
    error instanceof ApiError && !error.details ? error.message : null

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 shadow-card">
      <h2 className="text-base font-semibold text-ink">
        {isRegister ? 'Create your account' : 'Sign in'}
      </h2>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {isRegister && (
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            required
            placeholder="Alice"
            error={fieldError(error, 'name')}
          />
        )}

        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="98765 43210"
          hint={
            isRegister
              ? 'Friends find you by this number. It is never shown to anyone unless you choose to share it.'
              : undefined
          }
          error={fieldError(error, 'phone')}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          hint={isRegister ? 'At least 10 characters.' : undefined}
          error={fieldError(error, 'password')}
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
          {isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">
        {isRegister ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-accent hover:underline"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>

      {isRegister && (
        <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          CardCircle never asks for your full card number, CVV, PIN or OTP —
          and never will. Do not enter them anywhere in this app.
        </p>
      )}
    </div>
  )
}
