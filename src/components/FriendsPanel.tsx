'use client'

import Link from 'next/link'
import { SmartLink } from '@/components/SmartLink'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'
import type { Relationship } from '@/server/modules/cards/dto'

type Person = { id: string; name: string; avatarUrl: string | null }

type SearchResult = Person & { relationship: Relationship }

/**
 * Friends: search, list, remove, block.
 *
 * Search is by exact mobile number only. That is a deliberate constraint,
 * not a missing feature — a partial-match search over a user directory is a
 * phone-number enumeration tool.
 */
export function FriendsPanel({
  friends,
  blocked,
}: {
  friends: Person[]
  blocked: Person[]
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<
    { person: Person; action: 'remove' | 'block' } | null
  >(null)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone') ?? '').trim()
    if (!phone) return

    setSearching(true)
    setSearched(false)

    try {
      const response = await apiFetch<{ user: SearchResult | null }>(
        `/api/users/search?phone=${encodeURIComponent(phone)}`,
      )
      setResult(response.user)
      setSearched(true)
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Search failed.',
        'error',
      )
    } finally {
      setSearching(false)
    }
  }

  async function sendRequest(userId: string) {
    setPendingId(userId)
    try {
      const response = await apiFetch<{ status: 'sent' | 'accepted' }>(
        '/api/friends/requests',
        { method: 'POST', body: JSON.stringify({ userId }) },
      )
      toast(
        response.status === 'accepted'
          ? "You're now friends."
          : 'Friend request sent.',
        'success',
      )
      setResult(null)
      setSearched(false)
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not send request.',
        'error',
      )
    } finally {
      setPendingId(null)
    }
  }

  async function runConfirmed() {
    if (!confirming) return
    const { person, action } = confirming
    setPendingId(person.id)

    try {
      if (action === 'remove') {
        await apiFetch(`/api/friends/${person.id}`, { method: 'DELETE' })
        toast(`Removed ${person.name}.`, 'success')
      } else {
        await apiFetch(`/api/friends/${person.id}/block`, { method: 'POST' })
        toast(`Blocked ${person.name}.`, 'success')
      }
      setConfirming(null)
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Action failed.',
        'error',
      )
    } finally {
      setPendingId(null)
    }
  }

  async function unblock(person: Person) {
    setPendingId(person.id)
    try {
      await apiFetch(`/api/friends/${person.id}/block`, { method: 'DELETE' })
      toast(`Unblocked ${person.name}.`, 'success')
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not unblock.',
        'error',
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Find someone</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Search by their full mobile number.
        </p>

        <form onSubmit={handleSearch} className="mt-3 flex flex-wrap gap-2">
          <label htmlFor="friend-phone" className="sr-only">
            Mobile number
          </label>
          <input
            id="friend-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            placeholder="98765 43210"
            className="numeric h-10 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint"
          />
          <Button type="submit" loading={searching}>
            Search
          </Button>
        </form>

        {searched && !result && (
          <p className="mt-3 text-sm text-ink-muted">
            No CardCircle account uses that number.
          </p>
        )}

        {result && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-sunken px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink">{result.name}</p>
              <p className="text-xs text-ink-muted">
                {relationshipLabel(result.relationship)}
              </p>
            </div>
            {result.relationship === 'none' && (
              <Button
                size="sm"
                loading={pendingId === result.id}
                onClick={() => sendRequest(result.id)}
              >
                Send request
              </Button>
            )}
            {result.relationship === 'friends' && (
              <Link
                href={`/users/${result.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                View profile
              </Link>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">
          Friends ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No friends yet"
              description="Search for someone by their mobile number to send your first friend request."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised px-4 py-3 shadow-card"
              >
                <SmartLink
                  href={`/users/${friend.id}`}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  {friend.name}
                </SmartLink>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setConfirming({ person: friend, action: 'remove' })
                    }
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setConfirming({ person: friend, action: 'block' })
                    }
                  >
                    Block
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {blocked.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">
            Blocked ({blocked.length})
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            You and these people cannot see each other&apos;s cards or profiles.
          </p>
          <ul className="mt-3 space-y-2">
            {blocked.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised px-4 py-3"
              >
                <span className="text-sm text-ink">{person.name}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pendingId === person.id}
                  onClick={() => unblock(person)}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={runConfirmed}
        pending={pendingId !== null}
        title={
          confirming?.action === 'block' ? 'Block this person?' : 'Remove friend?'
        }
        description={
          confirming?.action === 'block'
            ? `${confirming.person.name} will no longer see your cards or profile, and you will not see theirs. Your friendship and any pending requests are removed immediately.`
            : `${confirming?.person.name ?? ''} will no longer see anything you share with friends.`
        }
        confirmLabel={confirming?.action === 'block' ? 'Block' : 'Remove'}
      />
    </div>
  )
}

function relationshipLabel(relationship: Relationship): string {
  switch (relationship) {
    case 'friends':
      return 'Already friends'
    case 'request_sent':
      return 'Request sent — waiting for them'
    case 'request_received':
      return 'They sent you a request'
    case 'self':
      return 'This is you'
    default:
      return 'Not connected'
  }
}

export function RelationshipBadge({
  relationship,
}: {
  relationship: Relationship
}) {
  if (relationship === 'friends') return <Badge tone="success">Friends</Badge>
  if (relationship === 'request_sent') return <Badge>Request sent</Badge>
  if (relationship === 'request_received')
    return <Badge tone="accent">Awaiting your response</Badge>
  return null
}
