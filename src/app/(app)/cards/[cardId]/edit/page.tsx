import { asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CardForm } from '@/components/CardForm'
import { db } from '@/db'
import { banks } from '@/db/schema'
import { AppError } from '@/server/common/errors'
import { getCurrentUser } from '@/server/modules/auth/session'
import { getOwnCard } from '@/server/modules/cards/service'

export const dynamic = 'force-dynamic'

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { cardId } = await params

  // getOwnCard scopes by owner, so another user's card id is simply a 404.
  let card
  try {
    card = await getOwnCard(user.id, cardId)
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  const bankRows = await db
    .select({ id: banks.id, name: banks.name, code: banks.code })
    .from(banks)
    .where(eq(banks.isActive, true))
    .orderBy(asc(banks.name))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/cards"
          className="inline-flex min-h-9 items-center text-sm text-ink-muted transition-colors hover:text-ink hover:underline"
        >
          ← My Cards
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Edit card</h1>
        <p className="mt-1 text-sm text-ink-muted">{card.product.name}</p>
      </div>

      <CardForm banks={bankRows} card={card} />
    </div>
  )
}
