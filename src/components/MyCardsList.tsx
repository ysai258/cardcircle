'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CardTile, VisibilityBadge } from '@/components/CardTile'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'
import type { OwnCardDTO } from '@/server/modules/cards/dto'

/**
 * My Cards, grouped by bank.
 *
 * The owner sees their own expiry in plain text — it is their data. Every
 * other viewer's access runs through the sharing settings edited here.
 */
export function MyCardsList({ cards }: { cards: OwnCardDTO[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [sharingCard, setSharingCard] = useState<OwnCardDTO | null>(null)
  const [deletingCard, setDeletingCard] = useState<OwnCardDTO | null>(null)
  const [pending, setPending] = useState(false)

  const byBank = new Map<string, { name: string; cards: OwnCardDTO[] }>()
  for (const card of cards) {
    const group = byBank.get(card.bank.id) ?? {
      name: card.bank.name,
      cards: [],
    }
    group.cards.push(card)
    byBank.set(card.bank.id, group)
  }

  async function saveSharing(formData: FormData) {
    if (!sharingCard) return
    setPending(true)

    try {
      await apiFetch(`/api/me/cards/${sharingCard.id}/sharing`, {
        method: 'PATCH',
        body: JSON.stringify({
          discoverability: String(formData.get('discoverability') ?? ''),
          expiryVisibility: String(formData.get('expiryVisibility') ?? ''),
        }),
      })

      toast('Sharing settings updated.', 'success')
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
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {group.cards.map((card) => (
                <li key={card.id} className="space-y-2">
                  {/* The same card face used everywhere else, so a card
                      looks the same in My Cards as in discovery. */}
                  <CardTile card={card} ownerLabel={false} />

                  <div className="flex flex-wrap items-center gap-2 px-0.5">
                    <VisibilityBadge discoverability={card.discoverability} />
                    {card.expiry && (
                      <span className="numeric text-xs text-ink-muted">
                        Expires {card.expiry}
                        <span className="text-ink-faint">
                          {' '}
                          (
                          {card.sharing.expiry === 'friends'
                            ? 'shared'
                            : 'not shared'}
                          )
                        </span>
                      </span>
                    )}

                    <span className="flex-1" />

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSharingCard(card)}
                    >
                      Sharing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingCard(card)}
                    >
                      Delete
                    </Button>
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
        title="Sharing settings"
        description={
          sharingCard
            ? `${sharingCard.bank.name} ${sharingCard.nickname}`
            : undefined
        }
      >
        {sharingCard && (
          <form
            id="sharing-form"
            action={saveSharing}
            className="space-y-4"
            key={sharingCard.id}
          >
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
              label="Share expiry with"
              name="expiryVisibility"
              defaultValue={sharingCard.sharing.expiry}
              hint={
                sharingCard.expiry
                  ? undefined
                  : 'You have not recorded an expiry for this card, so nothing will be shared.'
              }
            >
              <option value="nobody">Nobody</option>
              <option value="friends">My friends</option>
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
            ? `${deletingCard.bank.name} ${deletingCard.nickname} will be removed from CardCircle. Friends will no longer see it. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete card"
      />
    </>
  )
}
