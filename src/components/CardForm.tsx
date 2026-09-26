'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ExternalLinkIcon } from '@/components/CardPageLink'
import { Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { SelectField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError, fieldError } from '@/lib/api'
import { bankCardsPage } from '@/lib/bank-links'
import { bankGradient } from '@/lib/bank-theme'
import type { OwnCardDTO } from '@/server/modules/cards/dto'

/**
 * Add or edit a card.
 *
 * One component for both, because the fields and their rules are identical
 * and the differences are the endpoint and the initial values.
 *
 * Note what it does NOT collect: card number, CVV, PIN, last-4, expiry. The
 * last two were removed deliberately — under this product's framing your
 * friend makes the purchase, so nobody ever needs them, and not collecting
 * them is the only way to be certain they are not stored.
 */

type Bank = { id: string; name: string; code: string }
type Product = { id: string; name: string; isVerified: boolean }

const NETWORKS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'American Express' },
] as const

/** Sentinel for the "my card isn't listed" option. */
const OTHER = '__other__'

export function CardForm({
  banks,
  card,
}: {
  banks: Bank[]
  card?: OwnCardDTO
}) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = card !== undefined

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [bankId, setBankId] = useState(card?.bank.id ?? '')
  const [cardType, setCardType] = useState<'credit' | 'debit'>(
    card?.cardType ?? 'credit',
  )
  const [productId, setProductId] = useState(card?.product.id ?? '')
  const [otherName, setOtherName] = useState('')
  const [otherUrl, setOtherUrl] = useState('')

  const [formIssue, setFormIssue] = useState<string | undefined>()

  /**
   * Loaded products are tagged with the bank+type they belong to, rather
   * than being cleared when either changes. Clearing would mean calling
   * setState synchronously inside the effect, which cascades an extra
   * render; tagging lets the render below simply ignore a list that belongs
   * to a previous selection.
   */
  const productKey = bankId ? `${bankId}|${cardType}` : ''
  const [loaded, setLoaded] = useState<{ key: string; items: Product[] } | null>(
    null,
  )

  useEffect(() => {
    if (!productKey) return

    let cancelled = false

    apiFetch<{ items: Product[] }>(
      `/api/card-products?bankId=${bankId}&cardType=${cardType}`,
    )
      .then((result) => {
        if (!cancelled) setLoaded({ key: productKey, items: result.items })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: productKey, items: [] })
      })

    return () => {
      cancelled = true
    }
  }, [productKey, bankId, cardType])

  // Only trust a list that belongs to the current bank and card type.
  const products = loaded?.key === productKey ? loaded.items : []
  const loadingProducts = productKey !== '' && loaded?.key !== productKey

  const selectedBank = banks.find((bank) => bank.id === bankId)
  const bankCardsPageUrl = selectedBank
    ? bankCardsPage(selectedBank.code, cardType)
    : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormIssue(undefined)

    const form = new FormData(event.currentTarget)

    if (!bankId) return setFormIssue('Choose a bank')
    if (!productId) return setFormIssue('Choose your card')
    if (productId === OTHER && otherName.trim().length === 0) {
      return setFormIssue('Enter the name of your card')
    }

    setPending(true)
    setError(null)

    const payload = {
      bankId,
      cardType,
      ...(productId === OTHER
        ? {
            otherProductName: otherName.trim(),
            otherProductUrl: otherUrl.trim(),
          }
        : { productId }),
      network: String(form.get('network') ?? 'visa'),
      bin: String(form.get('bin') ?? ''),
      binVisibility: String(form.get('binVisibility') ?? 'friends'),
      discoverability: String(form.get('discoverability') ?? 'everyone'),
    }

    try {
      await apiFetch(isEdit ? `/api/me/cards/${card.id}` : '/api/me/cards', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      toast(isEdit ? 'Card updated.' : 'Card added.', 'success')
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

  const productOptions = [
    ...products.map((product) => ({
      value: product.id,
      label: product.isVerified ? product.name : `${product.name} (unverified)`,
    })),
    { value: OTHER, label: "Other — my card isn't listed" },
  ]

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
          CardCircle only needs to know WHICH card you hold. We do not process
          payments and store no card number, CVV, expiry or last-4 digits.
        </p>
      </div>

      <div className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <Combobox
          key={`bank-${card?.bank.id ?? 'new'}`}
          label="Bank"
          name="bankIdDisplay"
          placeholder={`Type to search ${banks.length} banks…`}
          hint="Start typing — “sbi”, “kotak”, “amex” all work."
          defaultValue={card?.bank.id}
          error={fieldError(error, 'bankId')}
          onChange={(value) => {
            setBankId(value)
            setProductId('')
          }}
          options={banks.map((bank) => ({
            value: bank.id,
            label: bank.name,
            keywords: bank.code,
          }))}
          renderOption={(option) => {
            const bank = banks.find((candidate) => candidate.id === option.value)
            return (
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded"
                  style={{ background: bankGradient(bank?.code ?? '') }}
                />
                {option.label}
              </span>
            )
          }}
        />

        <SelectField
          label="Card type"
          name="cardTypeDisplay"
          value={cardType}
          onChange={(event) => {
            setCardType(event.target.value as 'credit' | 'debit')
            setProductId('')
          }}
          hint="Changing this reloads the card list for that type."
        >
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </SelectField>

        {bankId && (
          <Combobox
            key={`${bankId}-${cardType}`}
            label="Which card?"
            name="productIdDisplay"
            placeholder={
              loadingProducts
                ? 'Loading cards…'
                : products.length > 0
                  ? `Search ${products.length} cards…`
                  : 'No cards listed yet — choose Other'
            }
            hint="Pick the exact card. If it isn't listed, choose Other."
            defaultValue={card?.product.id}
            error={fieldError(error, 'productId')}
            onChange={setProductId}
            options={productOptions}
          />
        )}

        {productId === OTHER && (
          <>
            <TextField
              label="Name of your card"
              name="otherProductName"
              value={otherName}
              onChange={(event) => setOtherName(event.target.value)}
              maxLength={120}
              placeholder="e.g. Axis Bank Horizon Credit Card"
              hint="This is added to the shared list so other members can pick it too. Please use the card's real name."
              error={fieldError(error, 'otherProductName')}
            />

            {/* Asked for, never required. A card that has no page on the
                bank's site is a real case, and a required field would only
                collect something made up. */}
            <TextField
              label="Link to this card on the bank's website (optional)"
              name="otherProductUrl"
              type="url"
              inputMode="url"
              value={otherUrl}
              onChange={(event) => setOtherUrl(event.target.value)}
              maxLength={400}
              placeholder="https://…"
              hint="Everyone who sees this card sees this link, so it has to be on the bank's own website. Leave it blank and the card links to the bank's card list instead."
              error={fieldError(error, 'otherProductUrl')}
            />

            {bankCardsPageUrl && (
              <p className="text-xs text-ink-muted">
                Find it on{' '}
                <a
                  href={bankCardsPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                >
                  the bank&apos;s {cardType} card list
                  <ExternalLinkIcon className="size-3" />
                </a>
                , then copy the address of your card&apos;s page.
              </p>
            )}
          </>
        )}

        <SelectField
          label="Network"
          name="network"
          defaultValue={card?.network ?? 'visa'}
          error={fieldError(error, 'network')}
        >
          {NETWORKS.map((network) => (
            <option key={network.value} value={network.value}>
              {network.label}
            </option>
          ))}
        </SelectField>

        <TextField
          label="First 6 digits (BIN)"
          name="bin"
          required
          inputMode="numeric"
          maxLength={6}
          defaultValue={card?.bin}
          placeholder="540123"
          className="numeric"
          hint="Identifies the card product, not your account. You choose below who can see it."
          error={fieldError(error, 'bin')}
        />
      </div>

      <div className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <div>
          <h2 className="text-sm font-semibold text-ink">Privacy</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            These settings are enforced by the server, not just hidden in the
            interface.
          </p>
        </div>

        <SelectField
          label="Who can discover this card?"
          name="discoverability"
          defaultValue={card?.discoverability ?? 'everyone'}
          error={fieldError(error, 'discoverability')}
        >
          <option value="everyone">
            Anyone on CardCircle (they can then send you a friend request)
          </option>
          <option value="friends">My friends only</option>
          <option value="nobody">Nobody — keep this card private</option>
        </SelectField>

        <SelectField
          label="Who can see the first 6 digits?"
          name="binVisibility"
          defaultValue={card?.binVisibility ?? 'friends'}
          hint="Hidden means people see only that you hold this card — enough to answer an offer question without showing any digits."
          error={fieldError(error, 'binVisibility')}
        >
          <option value="friends">My friends (recommended)</option>
          <option value="everyone">Anyone who can discover the card</option>
          <option value="nobody">Nobody — mask it completely</option>
        </SelectField>
      </div>

      {formIssue && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {formIssue}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/cards')}
        >
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {isEdit ? 'Save changes' : 'Add card'}
        </Button>
      </div>
    </form>
  )
}
