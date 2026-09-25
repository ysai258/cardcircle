import { Badge } from '@/components/ui/Badge'
import { cardTypeLabel, NetworkMark } from '@/components/NetworkMark'
import { bankGradient, bankInitials, bankTheme } from '@/lib/bank-theme'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * One card, drawn as a card.
 *
 * The face names the PRODUCT — "Airtel Axis Bank" — because that is what an
 * offer names and therefore what someone is actually looking for.
 *
 * The digits line shows the BIN only when the server sent one. A masked card
 * shows the product and network alone, which still answers "who has an
 * Airtel Axis Visa?" without publishing six digits of anyone's card. There
 * is no last-4 and no expiry on the face because those columns no longer
 * exist.
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
      className="relative flex aspect-[1.62/1] w-full flex-col overflow-hidden rounded-xl p-3.5 shadow-raised transition-transform duration-200 group-hover:-translate-y-0.5"
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
            className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-tight"
            style={{ color: theme.ink }}
          >
            {card.product.name}
          </p>
        </div>
        <NetworkMark network={card.network} onBrand />
      </div>

      <div className="relative mt-auto">
        {/* Chip. Decorative, but it is what makes the tile read as a card. */}
        <div
          aria-hidden="true"
          className="mb-1.5 h-5 w-7 rounded border border-white/25 bg-gradient-to-br from-amber-200/90 to-amber-400/80"
        />

        {card.bin ? (
          <p
            className="numeric text-[13px] tracking-[0.06em]"
            style={{ color: theme.ink }}
          >
            <span>{card.bin}</span>
            <span aria-hidden="true" className="pl-1 opacity-70">
              •• •••• ••••
            </span>
            <span className="sr-only">BIN {card.bin}</span>
          </p>
        ) : (
          <p
            className="numeric text-[13px] tracking-[0.06em]"
            style={{ color: theme.inkMuted }}
          >
            <span aria-hidden="true">•••• •••• •••• ••••</span>
            <span className="sr-only">Card number hidden by the owner</span>
          </p>
        )}
      </div>

      <div className="relative mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {ownerLabel && (
            <p
              className="truncate text-[11px] uppercase tracking-wide"
              style={{ color: theme.inkMuted }}
            >
              {card.owner.name}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'rgba(255,255,255,0.18)', color: theme.ink }}
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
      className="group w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${card.product.name}, ${cardTypeLabel(card.cardType)}, owned by ${card.owner.name}`}
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
  if (discoverability === 'nobody') return <Badge tone="neutral">Private</Badge>
  if (discoverability === 'friends') return <Badge tone="accent">Friends only</Badge>
  return <Badge tone="success">Discoverable</Badge>
}

/** What the owner has chosen to do with the first six digits. */
export function BinBadge({
  binVisibility,
}: {
  binVisibility: 'nobody' | 'friends' | 'everyone'
}) {
  if (binVisibility === 'nobody') return <Badge tone="neutral">BIN hidden</Badge>
  if (binVisibility === 'friends') return <Badge tone="accent">BIN: friends</Badge>
  return <Badge tone="success">BIN: everyone</Badge>
}
