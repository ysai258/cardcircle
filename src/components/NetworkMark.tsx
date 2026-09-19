import type { CardNetwork, CardType } from '@/db/schema'

/**
 * Card network labels.
 *
 * Deliberately wordmarks rather than the real brand logos: shipping Visa or
 * Mastercard artwork would imply an affiliation CardCircle does not have.
 */
const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'Amex',
}

const NETWORK_STYLES: Record<CardNetwork, string> = {
  visa: 'text-[#1a1f71] dark:text-[#8a92d6]',
  mastercard: 'text-[#b8541a] dark:text-[#f5a97a]',
  rupay: 'text-[#0b7a3b] dark:text-[#7fd6a3]',
  amex: 'text-[#1c5faa] dark:text-[#8fc2f0]',
}

export function NetworkMark({ network }: { network: CardNetwork }) {
  return (
    <span
      className={`text-xs font-bold tracking-wide ${NETWORK_STYLES[network]}`}
    >
      {NETWORK_LABELS[network]}
    </span>
  )
}

export function networkLabel(network: CardNetwork): string {
  return NETWORK_LABELS[network]
}

export function cardTypeLabel(cardType: CardType): string {
  return cardType === 'credit' ? 'Credit' : 'Debit'
}
