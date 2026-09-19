import { asc, eq } from 'drizzle-orm'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AddCardForm } from '@/components/AddCardForm'
import { db } from '@/db'
import { banks } from '@/db/schema'

export const metadata: Metadata = { title: 'Add a card — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function AddCardPage() {
  const bankRows = await db
    .select({ id: banks.id, name: banks.name })
    .from(banks)
    .where(eq(banks.isActive, true))
    .orderBy(asc(banks.name))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/cards"
          className="text-sm text-ink-muted hover:text-ink hover:underline"
        >
          ← My Cards
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-ink">Add a card</h1>
      </div>

      <AddCardForm banks={bankRows} />
    </div>
  )
}
