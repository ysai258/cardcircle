'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'
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
              {me.phone.masked}
              {!me.phone.verified && <Badge tone="warning">Unverified</Badge>}
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
              className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
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
                className="mt-0.5 accent-[var(--accent)]"
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

      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">What we store</h2>
        <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
          <li>
            Your mobile number, encrypted, plus a keyed digest so friends can
            find you by it.
          </li>
          <li>Your password, hashed with Argon2id. Never recoverable.</li>
          <li>
            For each card: bank, nickname, type, network, first 6 and last 4
            digits — and an expiry date only if you entered one, encrypted.
          </li>
        </ul>
        <p className="mt-3 text-xs font-medium text-ink">
          We never store full card numbers, CVVs, PINs or OTPs. There is no
          database column for them.
        </p>
      </section>
    </div>
  )
}
