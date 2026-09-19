import { Badge } from '@/components/ui/Badge'
import { cardTypeLabel, NetworkMark } from '@/components/NetworkMark'
import { bankGradient, bankInitials, bankTheme } from '@/lib/bank-theme'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * One card, drawn as a card.
 *
 * The face is laid out like a real one — issuer top-left, network top-right,
 * chip, then the digits — because that is how people recognise their own
 * cards. The number line shows what CardCircle actually holds: the real BIN,
 * dots for the six digits nobody stores, and the real last four.
 *
 * The background is the issuer's brand colour, never its logo. A colour is
 * decoration; a logo would imply an affiliation we do not have.
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
  const theme = bankTheme(card.bank.code)

  const face = (
    <div
      className="relative flex aspect-[1.62/1] w-full flex-col overflow-hidden rounded-2xl p-4 shadow-raised transition-transform duration-200 group-hover:-translate-y-0.5"
      style={{ background: bankGradient(card.bank.code), color: theme.ink }}
    >
      {/* Soft highlight so flat gradients read as a physical surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider">
            {bankInitials(card.bank.code, card.bank.name)}
          </p>
          <p
            className="mt-0.5 truncate text-sm font-semibold"
            style={{ color: theme.ink }}
          >
            {card.nickname}
          </p>
        </div>
        <NetworkMark network={card.network} onBrand />
      </div>

      {/* mt-auto pushes the chip + number block down as one unit, so the
          face has a single gap rather than two uneven ones. */}
      <div className="relative mt-auto">
        {/* Chip. Decorative, but it is what makes the tile read as a card. */}
        <div
          aria-hidden="true"
          className="mb-2 h-6 w-8 rounded-md border border-white/25 bg-gradient-to-br from-amber-200/90 to-amber-400/80"
        />

        <p className="numeric text-[15px] tracking-[0.1em]" style={{ color: theme.ink }}>
          <span>{card.bin}</span>
          <span aria-hidden="true" className="px-1 opacity-70">
            •• ••••
          </span>
          <span>{card.last4}</span>
        </p>
        <span className="sr-only">
          BIN {card.bin}, ending {card.last4}
        </span>
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {ownerLabel && (
            <p
              className="truncate text-[11px] uppercase tracking-wide"
              style={{ color: theme.inkMuted }}
            >
              {card.owner.name}
            </p>
          )}
          {card.variant && !ownerLabel && (
            <p
              className="truncate text-[11px]"
              style={{ color: theme.inkMuted }}
            >
              {card.variant}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.18)',
            color: theme.ink,
          }}
        >
          {cardTypeLabel(card.cardType)}
        </span>
      </div>
    </div>
  )

  if (!onOpen) return <div className="group">{face}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${card.bank.name} ${card.nickname}, ${cardTypeLabel(card.cardType)}, owned by ${card.owner.name}`}
    >
      {face}
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
    return <Badge tone="neutral">Private</Badge>
  }
  if (discoverability === 'friends') {
    return <Badge tone="accent">Friends only</Badge>
  }
  return <Badge tone="success">Discoverable</Badge>
}
