import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { MyCardsList } from '@/components/MyCardsList'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCurrentUser } from '@/server/modules/auth/session'
import { listOwnCards } from '@/server/modules/cards/service'

export const metadata: Metadata = { title: 'My Cards — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function MyCardsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const cards = await listOwnCards(user.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">My Cards</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {cards.length} card{cards.length === 1 ? '' : 's'} · you control
            what each one shares
          </p>
        </div>
        <Link
          href="/cards/new"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
        >
          Add card
        </Link>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="No cards yet"
          description="Add the cards you hold so friends can find out who has the card an offer needs. We only ask for the bank, network, BIN and last 4 digits."
          action={
            <Link
              href="/cards/new"
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
            >
              Add your first card
            </Link>
          }
        />
      ) : (
        <MyCardsList cards={cards} />
      )}
    </div>
  )
}
