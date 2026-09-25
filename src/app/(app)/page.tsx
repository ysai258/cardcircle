import Link from 'next/link'
import { HomeSearch } from '@/components/HomeSearch'
import { PendingRequestsBanner } from '@/components/PendingRequestsBanner'
import { SmartLink } from '@/components/SmartLink'
import { bankGradient, bankInitials } from '@/lib/bank-theme'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCurrentUser } from '@/server/modules/auth/session'
import { listBanksWithCounts } from '@/server/modules/cards/service'
import { listIncomingRequests } from '@/server/modules/friends/service'

export const dynamic = 'force-dynamic'

/**
 * Home — discovery by bank.
 *
 * The counts come from listBanksWithCounts, which applies the same
 * authorisation predicate as the bank listing. A bank only appears here if
 * this user can open at least one card in it.
 */
export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Fetched together so the extra round trip is concurrent, not sequential.
  const [banks, pendingRequests] = await Promise.all([
    listBanksWithCounts(user.id),
    listIncomingRequests(user.id),
  ])
  const totalCards = banks.reduce((sum, bank) => sum + bank.cardCount, 0)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Available cards</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {totalCards > 0
            ? `${totalCards} card${totalCards === 1 ? '' : 's'} your circle has made discoverable, across ${banks.length} bank${banks.length === 1 ? '' : 's'}.`
            : 'Cards your friends choose to share will appear here.'}
        </p>
      </header>

      <PendingRequestsBanner requests={pendingRequests} />

      <HomeSearch>
      {banks.length === 0 ? (
        <EmptyState
          title="No cards to show yet"
          description="Once you add friends — or they make their cards discoverable — you'll see which banks they hold cards with."
          action={
            <Link
              href="/friends"
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
            >
              Find friends
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <li key={bank.id}>
              <SmartLink
                href={`/banks/${bank.id}`}
                className="group flex items-center gap-3 overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-raised p-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised"
              >
                {/* The issuer's colour, so a bank is recognisable before
                    its name is read. */}
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-[11px] font-bold tracking-wide text-white"
                  style={{ background: bankGradient(bank.code) }}
                >
                  {bankInitials(bank.code, bank.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {bank.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {bank.cardCount} card{bank.cardCount === 1 ? '' : 's'}{' '}
                    available
                  </p>
                </div>

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                >
                  <path d="M7.5 4l6 6-6 6" />
                </svg>
              </SmartLink>
            </li>
          ))}
        </ul>
      )}
      </HomeSearch>
    </div>
  )
}
