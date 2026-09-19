'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError, fieldError } from '@/lib/api'

/**
 * Add Card.
 *
 * Note the fields that are absent and always will be: full card number, CVV,
 * PIN. The form collects only the metadata needed to answer "who has an HDFC
 * Visa credit card" — issuer, product, network, BIN and last 4.
 *
 * Client-side validation here is purely for fast feedback. The same rules
 * run again server-side in createCardSchema, which is the copy that counts.
 */

type Bank = { id: string; name: string }

const NETWORKS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'American Express' },
] as const

export function AddCardForm({ banks }: { banks: Bank[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const expiry = String(form.get('expiry') ?? '').trim()

    try {
      await apiFetch('/api/me/cards', {
        method: 'POST',
        body: JSON.stringify({
          bankId: String(form.get('bankId') ?? ''),
          nickname: String(form.get('nickname') ?? ''),
          variant: String(form.get('variant') ?? '').trim() || null,
          cardType: String(form.get('cardType') ?? 'credit'),
          network: String(form.get('network') ?? 'visa'),
          bin: String(form.get('bin') ?? ''),
          last4: String(form.get('last4') ?? ''),
          expiry: expiry === '' ? null : expiry,
          discoverability: String(form.get('discoverability') ?? 'everyone'),
          expiryVisibility: String(form.get('expiryVisibility') ?? 'nobody'),
        }),
      })

      toast('Card added.', 'success')
      router.push('/cards')
      router.refresh()
    } catch (caught) {
      setError(caught)
      if (caught instanceof ApiError && !caught.details) {
        toast(caught.message, 'error')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div
        role="note"
        className="rounded-(--radius-card) border border-warning/30 bg-warning-soft px-4 py-3"
      >
        <p className="text-sm font-medium text-warning">
          Never enter your full card number or CVV here.
        </p>
        <p className="mt-1 text-xs text-warning/90">
          CardCircle only needs card metadata for discovery. We do not process
          payments, and we never store card numbers, CVVs, PINs or OTPs.
        </p>
      </div>

      <div className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <SelectField
          label="Bank"
          name="bankId"
          required
          error={fieldError(error, 'bankId')}
          defaultValue=""
        >
          <option value="" disabled>
            Select a bank
          </option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Card nickname"
          name="nickname"
          required
          maxLength={100}
          placeholder="Millennia"
          hint="What you call this card. Not your card number."
          error={fieldError(error, 'nickname')}
        />

        <TextField
          label="Variant (optional)"
          name="variant"
          maxLength={100}
          placeholder="Millennia Credit Card"
          error={fieldError(error, 'variant')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Card type"
            name="cardType"
            defaultValue="credit"
            error={fieldError(error, 'cardType')}
          >
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </SelectField>

          <SelectField
            label="Network"
            name="network"
            defaultValue="visa"
            error={fieldError(error, 'network')}
          >
            {NETWORKS.map((network) => (
              <option key={network.value} value={network.value}>
                {network.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First 6 digits (BIN)"
            name="bin"
            required
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="540123"
            className="numeric"
            hint="Identifies the card product, not your account."
            error={fieldError(error, 'bin')}
          />

          <TextField
            label="Last 4 digits"
            name="last4"
            required
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            placeholder="1234"
            className="numeric"
            error={fieldError(error, 'last4')}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <div>
          <h2 className="text-sm font-semibold text-ink">Sharing</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            These settings are enforced by the server, not just hidden in the
            interface.
          </p>
        </div>

        <SelectField
          label="Who can discover this card?"
          name="discoverability"
          defaultValue="everyone"
          hint="Discovery shows only bank, name, type, network, BIN and last 4."
          error={fieldError(error, 'discoverability')}
        >
          <option value="everyone">
            Anyone on CardCircle (they can then send you a friend request)
          </option>
          <option value="friends">My friends only</option>
          <option value="nobody">Nobody — keep this card private</option>
        </SelectField>

        <TextField
          label="Expiry (optional)"
          name="expiry"
          maxLength={5}
          placeholder="MM/YY"
          className="numeric"
          hint="Stored encrypted. Shared only if you turn it on below."
          error={fieldError(error, 'expiry')}
        />

        <SelectField
          label="Share expiry with"
          name="expiryVisibility"
          defaultValue="nobody"
          error={fieldError(error, 'expiryVisibility')}
        >
          <option value="nobody">Nobody (recommended)</option>
          <option value="friends">My friends</option>
        </SelectField>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/cards')}
        >
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Add card
        </Button>
      </div>
    </form>
  )
}
