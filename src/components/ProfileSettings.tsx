'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/Field'
import { validateMobile } from '@/lib/form-validation'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError, fieldError } from '@/lib/api'
import type { MeDTO } from '@/server/modules/users/service'

/**
 * Profile and privacy settings.
 *
 * Phone visibility is a single account-level switch rather than a per-card
 * one: "friends may call me about my HDFC card but not my Axis card" is a
 * distinction with no real use, and more switches mean more ways to be wrong
 * about what you have shared.
 */
export function ProfileSettings({ me }: { me: MeDTO }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [visibility, setVisibility] = useState(me.phoneVisibility)

  const [phoneOpen, setPhoneOpen] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [phonePending, setPhonePending] = useState(false)
  const [phoneError, setPhoneError] = useState<unknown>(null)
  const [maskedPhone, setMaskedPhone] = useState(me.phone.masked)

  const phoneIssue = validateMobile(newPhone)

  async function changePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (phoneIssue) return

    const formData = new FormData(event.currentTarget)
    setPhonePending(true)
    setPhoneError(null)

    try {
      const result = await apiFetch<{ phone: { masked: string } }>('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          newPhone,
          password: String(formData.get('password') ?? ''),
        }),
      })

      setMaskedPhone(result.phone.masked)
      setPhoneOpen(false)
      setNewPhone('')
      toast('Mobile number updated.', 'success')
      router.refresh()
    } catch (caught) {
      setPhoneError(caught)
    } finally {
      setPhonePending(false)
    }
  }

  async function update(next: 'nobody' | 'friends') {
    const previous = visibility
    setVisibility(next)
    setPending(true)

    try {
      await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ phoneVisibility: next }),
      })
      toast(
        next === 'friends'
          ? 'Friends can now call you.'
          : 'Your number is hidden from everyone.',
        'success',
      )
      router.refresh()
    } catch (caught) {
      setVisibility(previous) // Roll the optimistic update back.
      toast(
        caught instanceof ApiError ? caught.message : 'Could not save.',
        'error',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-medium text-ink">{me.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Mobile number</dt>
            <dd className="numeric flex items-center gap-2 font-medium text-ink">
              {maskedPhone}
              {!me.phone.verified && <Badge tone="warning">Unverified</Badge>}
              <button
                type="button"
                onClick={() => setPhoneOpen(true)}
                className="inline-flex min-h-9 items-center rounded px-2 font-sans text-xs font-semibold text-accent hover:underline"
              >
                Change
              </button>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Member since</dt>
            <dd className="text-ink">
              {new Date(me.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        {!me.phone.verified && (
          <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            This version of CardCircle does not verify mobile numbers, so your
            number is shown to friends as unverified. Anyone you share it with
            should confirm it is really you before calling.
          </p>
        )}
      </section>

      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Phone number sharing</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          When shared, friends viewing your cards can call you so you can make
          the purchase yourself. Your number is never shown to anyone else.
        </p>

        <div className="mt-4 space-y-2">
          {(
            [
              {
                value: 'nobody' as const,
                title: 'Nobody',
                description:
                  'Your number stays hidden. Friends can still see your cards.',
              },
              {
                value: 'friends' as const,
                title: 'My friends',
                description:
                  'Accepted friends can see and call your number from your cards.',
              },
            ]
          ).map((option) => (
            <label
              key={option.value}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-3 transition-colors ${
                visibility === option.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-border-subtle hover:bg-surface-sunken'
              }`}
            >
              <input
                type="radio"
                name="phoneVisibility"
                value={option.value}
                checked={visibility === option.value}
                disabled={pending}
                onChange={() => update(option.value)}
                className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  {option.title}
                </span>
                <span className="block text-xs text-ink-muted">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <Dialog
        open={phoneOpen}
        onClose={() => {
          setPhoneOpen(false)
          setPhoneError(null)
        }}
        title="Change your mobile number"
        description="This is how friends find you."
      >
        <form onSubmit={changePhone} className="space-y-4" noValidate>
          <ul className="space-y-1 rounded-lg bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted">
            <li>Your friends and cards stay exactly as they are.</li>
            <li>
              Anyone who only has your OLD number will no longer be able to
              find you.
            </li>
            <li>The new number must not already be on CardCircle.</li>
          </ul>

          <TextField
            label="New mobile number"
            name="newPhone"
            type="tel"
            inputMode="numeric"
            required
            placeholder="98765 43210"
            className="numeric"
            value={newPhone}
            onChange={(event) => setNewPhone(event.target.value)}
            error={
              (newPhone.length > 0 ? phoneIssue : undefined) ??
              fieldError(phoneError, 'newPhone')
            }
          />

          <TextField
            label="Your password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            hint="Confirming with your password, not just your session."
            error={fieldError(phoneError, 'password')}
          />

          {phoneError instanceof ApiError && !phoneError.details && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {phoneError.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPhoneOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={phonePending}>
              Change number
            </Button>
          </div>
        </form>
      </Dialog>

      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">What we store</h2>
        <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
          <li>
            Your mobile number, encrypted, plus a keyed digest so friends can
            find you by it.
          </li>
          <li>Your password, hashed with Argon2id. Never recoverable.</li>
          <li>
            For each card: which card it is, its network, and the first 6
            digits — with your choice of who may see those digits.
          </li>
        </ul>
        <p className="mt-3 text-xs font-medium text-ink">
          We never store full card numbers, CVVs, PINs, OTPs, expiry dates or
          last-4 digits. There is no database column for any of them.
        </p>
      </section>
    </div>
  )
}
