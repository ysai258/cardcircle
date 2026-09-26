import { Badge } from '@/components/ui/Badge'
import { BankMark } from '@/components/BankMark'
import { cardLinkLabel, ExternalLinkIcon } from '@/components/CardPageLink'
import { cardTypeLabel, networkLabel } from '@/components/NetworkMark'
import { cardLink, linkHost } from '@/lib/bank-links'
import {
  bankGradientFor,
  bankTheme,
  cardPattern,
  cardPatternSize,
} from '@/lib/bank-theme'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * One card, drawn as a card.
 *
 * Every fact gets its own treatment rather than a wall of white text, so the
 * eye can find "whose is it" and "what kind is it" without reading:
 *
 *   bank      a solid mark, top-left
 *   product   the largest thing on the face
 *   network   an outlined pill, top-right
 *   digits    a monospace slab, or an explicit "hidden" state
 *   owner     a chip carrying their initial
 *   type      a filled pill — amber for credit, teal for debit
 *
 * There is no last-4 and no expiry, because those columns no longer exist.
 *
 * The background is the issuer's brand colour, never its logo unless a real
 * one is on file. A colour is decoration; a logo is a claim of affiliation.
 *
 * THE NAME IS A LINK, THE REST OF THE FACE IS A BUTTON
 *
 * Tapping the card opens its details; tapping the NAME goes to the issuer's
 * page for it, which is where the offers actually are. Two destinations on
 * one surface, so the button is an absolutely-positioned overlay rather than
 * a wrapper: an `<a>` nested inside a `<button>` is invalid HTML, and
 * browsers resolve it by ignoring one of them.
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
  const isCredit = card.cardType === 'credit'

  /**
   * Seeded on the PRODUCT, not the card id.
   *
   * Two people holding an HDFC Millennia then see the same face, so the card
   * becomes recognisable across the app rather than a different colour for
   * every row. Within a bank the products still differ from each other,
   * which is what stops a bank page being a wall of identical blue.
   */
  const seed = `${card.bank.code}:${card.product.name}`
  const faceBackground = bankGradientFor(card.bank.code, seed)
  const pattern = cardPattern(seed)

  const link = cardLink(card.bank.code, card.cardType, card.product.url)

  const face = (
    <div
      className="relative flex aspect-[1.6/1] w-full flex-col overflow-hidden rounded-2xl border-2 border-black/10 p-3.5 shadow-card transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-raised"
      style={{ background: faceBackground, color: theme.ink }}
    >
      {/* Covers the whole face, under the name link. Rendered first so it
          cannot swallow the link's clicks. */}
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${card.product.name}, ${cardTypeLabel(card.cardType)} ${networkLabel(card.network)}, owned by ${card.owner.name}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      )}
      {/* Texture. Colour alone left a bank's cards indistinguishable. */}
      {pattern && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: pattern,
            backgroundSize: cardPatternSize(seed),
          }}
        />
      )}

      {/* Gloss, so a flat gradient reads as a physical surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-20 size-48 rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.22), transparent)',
        }}
      />

      {/* Bank + network */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BankMark
            code={card.bank.code}
            name={card.bank.name}
            logoUrl={card.bank.logoUrl}
            size="sm"
            className="ring-1 ring-white/30"
          />
          <span
            className="truncate text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: theme.inkMuted }}
          >
            {card.bank.name}
          </span>
        </div>

        <span
          className="shrink-0 rounded-full border border-white/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: theme.ink }}
        >
          {networkLabel(card.network)}
        </span>
      </div>

      {/* Product — the thing people are actually looking for, and the way
          through to what it actually gets you. */}
      {link ? (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={cardLinkLabel(
            link.exact,
            card.bank.name,
            card.cardType,
            linkHost(link.url),
          )}
          /* `py-2` instead of the `mt-2` the plain name had, which leaves
             the text in exactly the same place while giving the link a
             thumb-sized hit area: a one-line card name is 19px tall, well
             under what anyone can reliably tap. It grows into the gap above
             and the flexible gap below, overlapping no other control. */
          className="relative z-20 inline-flex w-fit max-w-full items-start gap-1 py-2 text-left text-[15px] font-bold leading-tight underline decoration-transparent decoration-2 underline-offset-2 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ color: theme.ink }}
        >
          <span className="line-clamp-2">{card.product.name}</span>
          {/* The name is the label; the arrow only says it leaves the app. */}
          <ExternalLinkIcon className="mt-0.5 size-3 shrink-0 opacity-70" />
        </a>
      ) : (
        <p
          className="relative mt-2 line-clamp-2 text-[15px] font-bold leading-tight"
          style={{ color: theme.ink }}
        >
          {card.product.name}
        </p>
      )}

      {/* Digits, or an explicit locked state. */}
      <div className="relative mt-auto">
        {card.bin ? (
          <span className="numeric inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[12px] font-medium tracking-[0.14em] backdrop-blur-sm">
            <span style={{ color: theme.ink }}>{card.bin}</span>
            <span aria-hidden="true" style={{ color: theme.inkMuted }}>
              ••••
            </span>
            <span className="sr-only">BIN {card.bin}</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 text-[10px] font-medium backdrop-blur-sm"
            style={{ color: theme.inkMuted }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-3"
            >
              <rect x="4" y="9" width="12" height="7" rx="1.5" />
              <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
            </svg>
            Digits hidden
          </span>
        )}
      </div>

      {/* Owner + card type */}
      <div className="relative mt-2 flex items-end justify-between gap-2">
        {ownerLabel ? (
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/20 py-0.5 pl-0.5 pr-2 backdrop-blur-sm">
            <span
              aria-hidden="true"
              className="grid size-4 shrink-0 place-items-center rounded-full bg-white/90 text-[8px] font-bold"
              style={{ color: theme.from }}
            >
              {card.owner.name.slice(0, 1).toUpperCase()}
            </span>
            <span
              className="truncate text-[10px] font-semibold"
              style={{ color: theme.ink }}
            >
              {card.owner.name}
            </span>
          </span>
        ) : (
          <span />
        )}

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isCredit ? 'bg-amber-300 text-amber-950' : 'bg-teal-300 text-teal-950'
          }`}
        >
          {cardTypeLabel(card.cardType)}
        </span>
      </div>
    </div>
  )

  return <div className="group">{face}</div>
}

/** The visibility badge an owner sees on their own cards. */
export function VisibilityBadge({
  discoverability,
}: {
  discoverability: 'nobody' | 'friends' | 'everyone'
}) {
  if (discoverability === 'nobody') return <Badge tone="neutral">🔒 Private</Badge>
  if (discoverability === 'friends') return <Badge tone="accent">👥 Friends</Badge>
  return <Badge tone="success">🌐 Everyone</Badge>
}

/** What the owner has chosen to do with the first six digits. */
export function BinBadge({
  binVisibility,
}: {
  binVisibility: 'nobody' | 'friends' | 'everyone'
}) {
  if (binVisibility === 'nobody') return <Badge tone="neutral">BIN hidden</Badge>
  if (binVisibility === 'friends') return <Badge tone="accent">BIN · friends</Badge>
  return <Badge tone="success">BIN · everyone</Badge>
}
