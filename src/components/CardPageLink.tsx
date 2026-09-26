import { cardLink, linkHost, type CardType } from '@/lib/bank-links'

/**
 * Links a card to the issuer's own page for it.
 *
 * Two shapes of the same idea, sharing one helper so the destination and the
 * wording can never disagree between them:
 *
 *   - `ExternalLinkIcon`, used wherever a card name becomes a link;
 *   - `CardPageLink`, the explicit row in the card's detail view.
 *
 * WHY THE LABEL CHANGES
 *
 * `exact` distinguishes "the bank's page for THIS card" from "the bank's list
 * of cards", which is the fallback for the majority of the catalogue. Saying
 * "View this card on hdfc.bank.in" when the link actually lands on a list of
 * forty cards would be a small lie told hundreds of times a day, so the two
 * cases read differently.
 */

export function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 4h5v5" />
      <path d="M16 4 9 11" />
      <path d="M15.5 12.5V15a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5h2.5" />
    </svg>
  )
}

/** What the link promises, in words, for a title attribute or a caption. */
export function cardLinkLabel(
  exact: boolean,
  bankName: string,
  cardType: CardType,
  host: string,
): string {
  return exact
    ? `Offers and details for this card on ${host}`
    : `${bankName}'s ${cardType} cards on ${host} — this exact card has no page on file`
}

/**
 * The detail view's row.
 *
 * `rel="noopener noreferrer"` on every outbound link, and `target="_blank"`
 * so nobody loses the card they were looking at. The host is shown rather
 * than hidden behind link text: people should be able to see where a link
 * goes before they follow it, especially one about their bank.
 */
export function CardPageLink({
  bankCode,
  bankName,
  cardType,
  productUrl,
}: {
  bankCode: string
  bankName: string
  cardType: CardType
  productUrl: string | null
}) {
  const link = cardLink(bankCode, cardType, productUrl)
  if (!link) return null

  const host = linkHost(link.url)

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-border-strong bg-surface-raised px-3 py-2 transition-colors hover:bg-surface-sunken"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">
          {link.exact ? 'Offers & card details' : `All ${bankName} ${cardType} cards`}
        </span>
        <span className="block truncate text-xs text-ink-muted">
          {host}
          {!link.exact && ' — no page on file for this exact card'}
        </span>
      </span>
      <ExternalLinkIcon className="size-4 shrink-0 text-ink-muted" />
    </a>
  )
}

/**
 * A card's name, as a link when the issuer has a page for it.
 *
 * For the places that show a name in running text rather than on a card
 * face — the edit screen's subtitle, for one — so the name behaves the same
 * everywhere it appears.
 */
export function ProductNameLink({
  name,
  bankCode,
  bankName,
  cardType,
  productUrl,
  className,
}: {
  name: string
  bankCode: string
  bankName: string
  cardType: CardType
  productUrl: string | null
  className?: string
}) {
  const link = cardLink(bankCode, cardType, productUrl)
  if (!link) return <span className={className}>{name}</span>

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={cardLinkLabel(link.exact, bankName, cardType, linkHost(link.url))}
      className={`inline-flex items-center gap-1 hover:underline ${className ?? ''}`}
    >
      {name}
      <ExternalLinkIcon className="size-3 shrink-0 opacity-70" />
    </a>
  )
}
