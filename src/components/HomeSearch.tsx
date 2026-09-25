'use client'

import { useEffect, useState } from 'react'
import { CardDetailDialog } from '@/components/CardDetailDialog'
import { CardTile } from '@/components/CardTile'
import { Skeleton } from '@/components/ui/EmptyState'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * Search across every bank.
 *
 * Matches a card by bank name, bank code or product name, with optional
 * type, network and BIN filters. All of it runs server-side — the browser
 * never holds the inventory to narrow locally, which is both a disclosure
 * risk and something that stops scaling at a few thousand cards.
 *
 * BIN search only matches digits the searcher is allowed to see. A card
 * whose BIN is masked from you cannot be found BY that BIN, or the search
 * box would reveal exactly what the mask hides.
 */

type Results = {
  items: CardSummaryDTO[]
  total: number
  totalPages: number
  page: number
}

const TYPES = [
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

export function HomeSearch({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const [bin, setBin] = useState('')
  const [cardType, setCardType] = useState('')
  const [network, setNetwork] = useState('')
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const hasCriteria =
    query.trim().length > 0 || bin.length > 0 || cardType !== '' || network !== ''

  // Tagged with the exact criteria it answers, so a slow response for an
  // older query can never overwrite a newer one.
  const key = hasCriteria ? `${query.trim()}|${bin}|${cardType}|${network}` : ''
  const [loaded, setLoaded] = useState<{ key: string; results: Results } | null>(
    null,
  )

  useEffect(() => {
    if (!key) return

    let cancelled = false
    // Debounced: typing should not fire a request per keystroke.
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (bin) params.set('bin', bin)
      if (cardType) params.set('cardType', cardType)
      if (network) params.set('network', network)
      params.set('pageSize', '24')

      apiFetch<Results>(`/api/cards/search?${params.toString()}`)
        .then((results) => {
          if (!cancelled) setLoaded({ key, results })
        })
        .catch(() => {
          if (!cancelled) {
            setLoaded({
              key,
              results: { items: [], total: 0, totalPages: 1, page: 1 },
            })
          }
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [key, query, bin, cardType, network])

  const results = loaded?.key === key ? loaded.results : null
  const searching = hasCriteria && results === null

  return (
    /*
      Search to the side on a wide screen. As a full-width band it pushed the
      cards below the fold and left the margins empty; as a sidebar it stays
      visible while you scroll the results.
    */
    <div className="gap-6 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
      <aside className="mb-6 space-y-3 rounded-(--radius-card) border-2 border-border-subtle bg-surface-raised p-4 shadow-card lg:sticky lg:top-4 lg:mb-0">
        <div>
          <label htmlFor="card-search" className="sr-only">
            Search cards by bank or card name
          </label>
          <div className="relative">
            <input
              id="card-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a bank or card"
              className="w-full rounded-lg border-2 border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent"
            />
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13 13l4 4" />
            </svg>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Try “axis”, “airtel”, “amazon pay”.
          </p>
        </div>

        <div>
          <label
            htmlFor="card-search-bin"
            className="block text-xs font-medium text-ink-muted"
          >
            BIN (first 6 digits)
          </label>
          <input
            id="card-search-bin"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={bin}
            onChange={(event) =>
              setBin(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="540123"
            className="numeric mt-1.5 w-full rounded-lg border-2 border-border-strong bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent"
          />
        </div>

        <Chips label="Type" options={TYPES} value={cardType} onChange={setCardType} />
        <Chips
          label="Network"
          options={NETWORKS}
          value={network}
          onChange={setNetwork}
        />

        {hasCriteria && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setBin('')
              setCardType('')
              setNetwork('')
            }}
            className="w-full rounded-lg border-2 border-border-strong px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </aside>

      <div className="min-w-0">
        {!hasCriteria && children}

        {hasCriteria && (
          <>
            {searching && (
              <div
                className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]"
                aria-hidden="true"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[1.6/1] rounded-2xl" />
                ))}
              </div>
            )}

            {results && results.items.length === 0 && (
              <p className="rounded-(--radius-card) border-2 border-dashed border-border-strong bg-surface-raised px-4 py-10 text-center text-sm text-ink-muted">
                Nothing matches that. Try a bank name, a card name, or fewer
                filters.
              </p>
            )}

            {results && results.items.length > 0 && (
              <>
                <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
                  {results.total} card{results.total === 1 ? '' : 's'} found
                  {results.total > results.items.length &&
                    ` · showing the first ${results.items.length}`}
                </p>
                <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
                  {results.items.map((card) => (
                    <li key={card.id}>
                      <CardTile card={card} onOpen={() => setOpenCardId(card.id)} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <CardDetailDialog
        cardId={openCardId}
        open={openCardId !== null}
        onClose={() => setOpenCardId(null)}
      />
    </div>
  )
}

function Chips({
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
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <div
        role="group"
        aria-label={label}
        className="mt-1.5 flex flex-wrap gap-1.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border-2 px-2.5 text-xs font-semibold transition-colors',
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
