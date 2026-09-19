import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BankCardList } from '@/components/BankCardList'
import { CardFilters } from '@/components/CardFilters'
import { db } from '@/db'
import { banks } from '@/db/schema'
import { getCurrentUser } from '@/server/modules/auth/session'
import { listCardsByBank } from '@/server/modules/cards/service'
import { cardFiltersSchema } from '@/server/modules/cards/validation'

export const dynamic = 'force-dynamic'

/**
 * Bank page.
 *
 * Filtering and pagination happen in SQL via listCardsByBank. Invalid query
 * parameters fall back to defaults rather than erroring, so a hand-edited
 * URL degrades to the unfiltered view instead of a crash.
 */
export default async function BankPage({
  params,
  searchParams,
}: {
  params: Promise<{ bankId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { bankId } = await params
  const rawSearch = await searchParams

  const [bank] = await db
    .select({ id: banks.id, name: banks.name })
    .from(banks)
    .where(eq(banks.id, bankId))
    .limit(1)

  if (!bank) notFound()

  const parsed = cardFiltersSchema.safeParse(
    Object.fromEntries(
      Object.entries(rawSearch).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ),
  )

  const filters = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20 as const }

  const result = await listCardsByBank(user.id, bank.id, filters)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-ink-muted hover:text-ink hover:underline"
        >
          ← All banks
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink">{bank.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {result.total} card{result.total === 1 ? '' : 's'} you can see
        </p>
      </div>

      <CardFilters />

      <BankCardList cards={result.items} />

      {result.totalPages > 1 && (
        <Pagination
          bankId={bank.id}
          page={result.page}
          totalPages={result.totalPages}
          search={rawSearch}
        />
      )}
    </div>
  )
}

function Pagination({
  bankId,
  page,
  totalPages,
  search,
}: {
  bankId: string
  page: number
  totalPages: number
  search: Record<string, string | string[] | undefined>
}) {
  function hrefFor(target: number): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(search)) {
      if (key === 'page') continue
      const single = Array.isArray(value) ? value[0] : value
      if (single) params.set(key, single)
    }
    params.set('page', String(target))
    return `/banks/${bankId}?${params.toString()}`
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-border-subtle pt-4"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="text-sm text-ink-muted">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
