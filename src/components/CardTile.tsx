import { Badge } from '@/components/ui/Badge'
import { cardTypeLabel, NetworkMark } from '@/components/NetworkMark'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * One card in a list.
 *
 * Shows only what CardSummaryDTO carries — bank, name, type, network, BIN
 * and last 4. There is no branch here that could reveal an expiry or a phone
 * number, because the type it receives has nowhere to put them.
 */
export function CardTile({
  card,
  onOpen,
  ownerLabel = true,
}: {
  card: CardSummaryDTO
  onOpen?: () => void
  ownerLabel?: boolean
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {card.nickname}
          </p>
          {card.variant && (
            <p className="truncate text-xs text-ink-muted">{card.variant}</p>
          )}
        </div>
        <NetworkMark network={card.network} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span>{cardTypeLabel(card.cardType)}</span>
        <span aria-hidden="true">·</span>
        <span className="numeric">BIN {card.bin}</span>
        <span aria-hidden="true">·</span>
        <span className="numeric">
          {/* Screen readers get words; sighted users get the dot pattern. */}
          <span aria-hidden="true">•••• {card.last4}</span>
          <span className="sr-only">ending {card.last4}</span>
        </span>
      </div>

      {ownerLabel && (
        <p className="mt-3 text-xs text-ink-faint">
          Owned by <span className="text-ink-muted">{card.owner.name}</span>
        </p>
      )}
    </>
  )

  if (!onOpen) {
    return (
      <div className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-4 shadow-card">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-(--radius-card) border border-border-subtle bg-surface-raised p-4 text-left shadow-card transition-colors hover:border-border-strong hover:bg-surface-sunken"
    >
      {content}
    </button>
  )
}

/** The visibility badge an owner sees on their own cards. */
export function VisibilityBadge({
  discoverability,
}: {
  discoverability: 'nobody' | 'friends' | 'everyone'
}) {
  if (discoverability === 'nobody') {
    return <Badge tone="neutral">🔒 Private</Badge>
  }
  if (discoverability === 'friends') {
    return <Badge tone="accent">👥 Friends</Badge>
  }
  return <Badge tone="success">🌐 Discoverable</Badge>
}
