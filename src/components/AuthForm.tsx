'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { RecoveryCodes } from '@/components/RecoveryCodes'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { apiFetch, ApiError, fieldError } from '@/lib/api'
import {
  extractMobileDigits,
  passwordStrength,
  validateMobile,
  validatePassword,
} from '@/lib/form-validation'

/**
 * Sign-in and sign-up.
 *
 * Validation runs as the user types, but only after they have left a field
 * or attempted to submit — flagging "8 more characters needed" on the first
 * keystroke is noise, not help. Every rule here is re-checked server-side.
 */
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const isRegister = mode === 'register'

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [newCodes, setNewCodes] = useState<string[] | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const phoneIssue = validateMobile(phone)
  // On sign-in any password may be correct; only sign-up enforces a floor.
  const passwordIssue = isRegister ? validatePassword(password) : undefined
  const nameIssue =
    isRegister && name.trim().length === 0 ? 'Enter your name' : undefined

  const show = (field: string): boolean => touched[field] === true
  const markTouched = (field: string) =>
    setTouched((current) => ({ ...current, [field]: true }))

  const strength = passwordStrength(password)
  const canSubmit = !phoneIssue && !passwordIssue && !nameIssue

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      // Reveal every problem at once rather than one per attempt.
      setTouched({ name: true, phone: true, password: true })
      return
    }

    setPending(true)
    setError(null)

    const payload = isRegister
      ? { name: name.trim(), phone, password }
      : { phone, password }

    try {
      const result = await apiFetch<{ id: string; recoveryCodes?: string[] }>(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        { method: 'POST', body: JSON.stringify(payload) },
      )

      if (isRegister && result.recoveryCodes) {
        setNewCodes(result.recoveryCodes)
        return
      }

      router.push('/')
      router.refresh()
    } catch (caught) {
      setError(caught)
    } finally {
      setPending(false)
    }
  }

  if (newCodes) {
    return (
      <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Your recovery codes</h2>
        <p className="mt-1 mb-5 text-sm text-ink-muted">
          Your account is ready. One last thing.
        </p>
        <RecoveryCodes
          codes={newCodes}
          acknowledgeLabel="Continue to CardCircle"
          onAcknowledge={() => {
            router.push('/')
            router.refresh()
          }}
        />
      </div>
    )
  }

  const generalError =
    error instanceof ApiError && !error.details ? error.message : null

  const digits = extractMobileDigits(phone)

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-6 shadow-card">
      <h2 className="text-lg font-semibold text-ink">
        {isRegister ? 'Create your account' : 'Welcome back'}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {isRegister
          ? 'Your mobile number is how friends find you.'
          : 'Sign in to see who has the card you need.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {isRegister && (
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Alice"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => markTouched('name')}
            error={
              (show('name') ? nameIssue : undefined) ?? fieldError(error, 'name')
            }
          />
        )}

        <TextField
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98765 43210"
          className="numeric"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          onBlur={() => markTouched('phone')}
          hint={
            isRegister
              ? `10 digits · ${digits.length}/10 entered`
              : undefined
          }
          error={
            (show('phone') ? phoneIssue : undefined) ??
            fieldError(error, 'phone')
          }
        />

        <div>
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => markTouched('password')}
            hint={isRegister ? 'At least 8 characters.' : undefined}
            error={
              (show('password') ? passwordIssue : undefined) ??
              fieldError(error, 'password')
            }
          />

          {isRegister && password.length > 0 && !passwordIssue && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className="flex h-1 flex-1 gap-1"
                role="img"
                aria-label={`Password strength: ${strength.label}`}
              >
                {[1, 2, 3].map((level) => (
                  <span
                    key={level}
                    className={`h-full flex-1 rounded-full transition-colors ${
                      level <= strength.score
                        ? strength.score === 3
                          ? 'bg-success'
                          : strength.score === 2
                            ? 'bg-accent'
                            : 'bg-warning'
                        : 'bg-border-subtle'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-muted">{strength.label}</span>
            </div>
          )}
        </div>

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

      {!isRegister && (
        <p className="mt-4 text-center text-sm">
          <Link
            href="/reset-password"
            className="text-ink-muted transition-colors hover:text-ink hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      )}

      <p className="mt-5 border-t border-border-subtle pt-5 text-center text-sm text-ink-muted">
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
