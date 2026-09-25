'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { BinBadge, CardTile, VisibilityBadge } from '@/components/CardTile'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'
import type { OwnCardDTO } from '@/server/modules/cards/dto'

/**
 * My Cards, grouped by bank.
 *
 * The owner always sees their own BIN — it is their data. What the privacy
 * dialog controls is what everyone ELSE sees.
 */
export function MyCardsList({ cards }: { cards: OwnCardDTO[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [sharingCard, setSharingCard] = useState<OwnCardDTO | null>(null)
  const [deletingCard, setDeletingCard] = useState<OwnCardDTO | null>(null)
  const [pending, setPending] = useState(false)

  const byBank = new Map<string, { name: string; cards: OwnCardDTO[] }>()
  for (const card of cards) {
    const group = byBank.get(card.bank.id) ?? { name: card.bank.name, cards: [] }
    group.cards.push(card)
    byBank.set(card.bank.id, group)
  }

  async function saveSharing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sharingCard) return

    const formData = new FormData(event.currentTarget)
    setPending(true)

    try {
      await apiFetch(`/api/me/cards/${sharingCard.id}/sharing`, {
        method: 'PATCH',
        body: JSON.stringify({
          discoverability: String(formData.get('discoverability') ?? ''),
          binVisibility: String(formData.get('binVisibility') ?? ''),
        }),
      })

      toast('Privacy settings updated.', 'success')
      setSharingCard(null)
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not save settings.',
        'error',
      )
    } finally {
      setPending(false)
    }
  }

  async function confirmDelete() {
    if (!deletingCard) return
    setPending(true)

    try {
      await apiFetch(`/api/me/cards/${deletingCard.id}`, { method: 'DELETE' })
      toast('Card deleted.', 'success')
      setDeletingCard(null)
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not delete card.',
        'error',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="space-y-8">
        {[...byBank.entries()].map(([bankId, group]) => (
          <section key={bankId}>
            <h2 className="text-sm font-semibold text-ink-muted">
              {group.name}
            </h2>
            <ul className="mt-3 grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
              {group.cards.map((card) => (
                <li key={card.id} className="space-y-2">
                  <CardTile card={card} ownerLabel={false} />

                  {/* Fixed rows, so cards in the same row stay aligned
                      regardless of how many badges each one carries. */}
                  <div className="space-y-1.5 px-0.5">
                    <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
                      <VisibilityBadge discoverability={card.discoverability} />
                      <BinBadge binVisibility={card.binVisibility} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/cards/${card.id}/edit`}
                        className="inline-flex h-8 items-center rounded-lg border border-border-strong bg-surface-raised px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
                      >
                        Edit
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSharingCard(card)}
                      >
                        Privacy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingCard(card)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog
        open={sharingCard !== null}
        onClose={() => setSharingCard(null)}
        title="Privacy settings"
        description={sharingCard?.product.name}
      >
        {sharingCard && (
          <form onSubmit={saveSharing} className="space-y-4" key={sharingCard.id}>
            <SelectField
              label="Who can discover this card?"
              name="discoverability"
              defaultValue={sharingCard.discoverability}
            >
              <option value="everyone">Anyone on CardCircle</option>
              <option value="friends">My friends only</option>
              <option value="nobody">Nobody — private</option>
            </SelectField>

            <SelectField
              label="Who can see the first 6 digits?"
              name="binVisibility"
              defaultValue={sharingCard.binVisibility}
              hint="Hidden means people see only that you hold this card."
            >
              <option value="friends">My friends</option>
              <option value="everyone">Anyone who can discover it</option>
              <option value="nobody">Nobody — mask completely</option>
            </SelectField>

            <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
              Your phone number is controlled separately, on your Profile.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSharingCard(null)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={deletingCard !== null}
        onClose={() => setDeletingCard(null)}
        onConfirm={confirmDelete}
        pending={pending}
        title="Delete this card?"
        description={
          deletingCard
            ? `${deletingCard.product.name} will be removed from CardCircle. Friends will no longer see it. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete card"
      />
    </>
  )
}
