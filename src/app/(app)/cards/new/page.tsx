import { asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CardForm } from '@/components/CardForm'
import { db } from '@/db'
import { banks } from '@/db/schema'

export const metadata: Metadata = { title: 'Add a card — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function AddCardPage() {
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
        <h1 className="mt-2 text-2xl font-semibold text-ink">Add a card</h1>
      </div>

      <CardForm banks={bankRows} />
    </div>
  )
}
