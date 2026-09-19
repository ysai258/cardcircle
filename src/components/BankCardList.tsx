'use client'

import { useState } from 'react'
import { CardDetailDialog } from '@/components/CardDetailDialog'
import { CardTile } from '@/components/CardTile'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CardSummaryDTO } from '@/server/modules/cards/dto'

/**
 * The card grid on a bank page.
 *
 * Receives an already-filtered, already-paginated page of summaries from the
 * server. Opening a card fetches its detail separately, so the list response
 * never has to carry fields most viewers are not entitled to.
 */
export function BankCardList({ cards }: { cards: CardSummaryDTO[] }) {
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  if (cards.length === 0) {
    return (
      <EmptyState
        title="No cards match these filters"
        description="Try clearing the card type, network or BIN filter — or ask a friend to make their card discoverable."
      />
    )
  }

  return (
    <>
      <ul className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
        {cards.map((card) => (
          <li key={card.id}>
            <CardTile card={card} onOpen={() => setOpenCardId(card.id)} />
          </li>
        ))}
      </ul>

      <CardDetailDialog
        cardId={openCardId}
        open={openCardId !== null}
        onClose={() => setOpenCardId(null)}
      />
    </>
  )
}
