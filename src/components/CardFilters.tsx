'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Bank page filters.
 *
 * Filter state lives in the URL, so a filtered view is shareable and the
 * back button behaves. Changing a filter re-runs the SERVER query — the
 * browser never holds the unfiltered inventory to narrow locally.
 */

const CARD_TYPES = [
  { value: '', label: 'All' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
] as const

const NETWORKS = [
  { value: '', label: 'All' },
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'Amex' },
] as const

export function CardFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const cardType = searchParams.get('cardType') ?? ''
  const network = searchParams.get('network') ?? ''
  const binParam = searchParams.get('bin') ?? ''

  const [bin, setBin] = useState(binParam)
  const [syncedParam, setSyncedParam] = useState(binParam)

  // Keep the input in step when navigation changes the URL (back button).
  // Adjusting state during render is React's recommended way to derive from
  // a changing prop; doing it in an effect would render twice on every
  // navigation. See https://react.dev/learn/you-might-not-need-an-effect
  if (binParam !== syncedParam) {
    setSyncedParam(binParam)
    setBin(binParam)
  }

  /**
   * Successive filter clicks must accumulate.
   *
   * router.push starts a transition; neither `searchParams` nor
   * window.location updates until it commits. Building each change from the
   * committed value alone means a second click lands before the first has
   * committed and silently discards it — pick "Credit" then "Visa" quickly
   * and the card-type filter vanishes.
   *
   * So the in-flight query string is tracked in state (kept beside the
   * committed value it was derived from) and reset whenever a navigation
   * actually commits.
   */
  const committedParams = searchParams.toString()
  const [pending, setPending] = useState({
    base: committedParams,
    value: committedParams,
  })

  if (pending.base !== committedParams) {
    setPending({ base: committedParams, value: committedParams })
  }

  function apply(changes: Record<string, string>) {
    const params = new URLSearchParams(pending.value)

    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    // Any filter change invalidates the current page number.
    params.delete('page')

    const next = params.toString()
    setPending({ base: committedParams, value: next })
    router.push(`${pathname}?${next}`)
  }

  // Debounce BIN typing so each keystroke is not a round trip.
  useEffect(() => {
    if (bin === binParam) return

    const timer = window.setTimeout(() => {
      if (bin === '' || /^\d{1,6}$/.test(bin)) apply({ bin })
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bin])

  return (
    <div className="space-y-4 rounded-(--radius-card) border-2 border-border-subtle bg-surface-raised p-4 shadow-card">
      <FilterRow
        label="Card type"
        options={CARD_TYPES}
        value={cardType}
        onChange={(value) => apply({ cardType: value })}
      />
      <FilterRow
        label="Network"
        options={NETWORKS}
        value={network}
        onChange={(value) => apply({ network: value })}
      />

      <div>
        <label
          htmlFor="bin-search"
          className="block text-xs font-medium text-ink-muted"
        >
          BIN (first 6 digits)
        </label>
        <input
          id="bin-search"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={bin}
          onChange={(event) =>
            setBin(event.target.value.replace(/\D/g, '').slice(0, 6))
          }
          placeholder="540123"
          className="numeric mt-1.5 w-full rounded-lg border-2 border-border-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>
    </div>
  )
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  // useId, not a slug of the label: an id derived from "Card type" would
  // contain a space, and aria-labelledby splits on whitespace — so the group
  // would silently end up with no accessible name at all.
  const labelId = useId()

  return (
    <div>
      <p className="text-xs font-medium text-ink-muted" id={labelId}>
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-1.5 flex flex-wrap gap-1.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border-2 px-3 text-xs font-semibold transition-colors',
              value === option.value
                ? 'border-transparent bg-accent text-accent-ink'
                : 'border-border-strong bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
