'use client'

import { useEffect, useState } from 'react'
import { cardTypeLabel, networkLabel } from '@/components/NetworkMark'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'
import type { CardDetailDTO, OwnCardDTO } from '@/server/modules/cards/dto'

/**
 * Card detail.
 *
 * Every field rendered here comes from the server's response. There is no
 * masking in this component and no conditional that hides a value the API
 * sent — if the viewer is not entitled to an expiry date, `shared.expiry` is
 * simply absent from the payload. The UI renders what it was given.
 */

type DetailResponse =
  | { kind: 'visitor'; card: CardDetailDTO }
  | { kind: 'owner'; card: OwnCardDTO }

export function CardDetailDialog({
  cardId,
  open,
  onClose,
}: {
  cardId: string | null
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)

  /**
   * The loaded result is stored together with the card id it belongs to,
   * rather than being cleared when `cardId` changes. Clearing would mean
   * calling setState synchronously inside the effect, which cascades an
   * extra render; tagging the result lets the render below simply ignore a
   * response that belongs to a previously opened card.
   */
  const [loaded, setLoaded] = useState<{
    cardId: string
    data: DetailResponse | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!open || !cardId) return

    let cancelled = false

    apiFetch<DetailResponse>(`/api/cards/${cardId}`)
      .then((result) => {
        if (!cancelled) setLoaded({ cardId, data: result, error: null })
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setLoaded({
          cardId,
          data: null,
          error:
            caught instanceof ApiError
              ? caught.message
              : 'Could not load this card.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [cardId, open])

  // Only trust state that belongs to the card currently open.
  const current = loaded && loaded.cardId === cardId ? loaded : null
  const data = current?.data ?? null
  const error = current?.error ?? null

  async function sendFriendRequest(userId: string) {
    setSending(true)
    try {
      const result = await apiFetch<{ status: 'sent' | 'accepted' }>(
        '/api/friends/requests',
        { method: 'POST', body: JSON.stringify({ userId }) },
      )

      toast(
        result.status === 'accepted'
          ? "You're now friends — they had already sent you a request."
          : "Friend request sent. Once accepted, you'll see what they've chosen to share.",
        'success',
      )
      onClose()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not send request.',
        'error',
      )
    } finally {
      setSending(false)
    }
  }

  const card = data?.card ?? null
  const visitor = data?.kind === 'visitor' ? data.card : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={card ? `${card.bank.name} ${card.nickname}` : 'Card details'}
      description={card ? `Owned by ${card.owner.name}` : undefined}
      footer={
        visitor?.access.canSendFriendRequest ? (
          <Button
            onClick={() => sendFriendRequest(visitor.owner.id)}
            loading={sending}
          >
            Send friend request
          </Button>
        ) : undefined
      }
    >
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {!data && !error && (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      )}

      {card && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Row label="Type" value={cardTypeLabel(card.cardType)} />
            <Row label="Network" value={networkLabel(card.network)} />
            <Row label="BIN" value={card.bin} numeric />
            <Row label="Last 4" value={card.last4} numeric />
            {card.variant && (
              <div className="col-span-2">
                <Row label="Variant" value={card.variant} />
              </div>
            )}
          </dl>

          {/* Expiry: present only when the server released it. */}
          {visitor?.shared.expiry && (
            <div className="rounded-lg border border-border-subtle bg-surface-sunken px-3 py-2.5">
              <dt className="text-xs text-ink-muted">Expiry</dt>
              <dd className="numeric mt-0.5 text-sm font-medium text-ink">
                {visitor.shared.expiry}
              </dd>
            </div>
          )}

          {/* The point of the product: reach the owner so THEY can pay. */}
          {visitor?.shared.phone && (
            <div className="rounded-lg border border-border-subtle bg-surface-sunken px-3 py-3">
              <p className="text-xs text-ink-muted">
                {card.owner.name}&apos;s number
              </p>
              <p className="numeric mt-0.5 text-sm font-medium text-ink">
                {visitor.shared.phone.e164}
              </p>
              {!visitor.shared.phone.verified && (
                <p className="mt-1.5 text-xs text-ink-faint">
                  This number has not been verified by CardCircle.
                </p>
              )}
              <a
                href={`tel:${visitor.shared.phone.e164}`}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-hover"
              >
                Call {card.owner.name}
              </a>
              <p className="mt-2.5 text-xs text-ink-muted">
                Ask {card.owner.name} to make the purchase — they keep their
                card and handle any OTP themselves.
              </p>
            </div>
          )}

          {visitor && !visitor.access.canViewSharedDetails && (
            <p className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-accent">
              Some details are available only to friends.
            </p>
          )}

          {visitor?.access.relationship === 'request_sent' && (
            <Badge tone="neutral">Friend request pending</Badge>
          )}
          {visitor?.access.relationship === 'request_received' && (
            <Badge tone="accent">They sent you a friend request</Badge>
          )}

          {/* Constant across every view: CardCircle has no CVV to give. */}
          <p className="border-t border-border-subtle pt-4 text-xs text-ink-faint">
            CVV is never available through CardCircle. Neither is the full card
            number — we do not store either.
          </p>
        </div>
      )}
    </Dialog>
  )
}

function Row({
  label,
  value,
  numeric = false,
}: {
  label: string
  value: string
  numeric?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={`mt-0.5 font-medium text-ink ${numeric ? 'numeric' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
