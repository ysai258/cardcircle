'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { apiFetch, ApiError } from '@/lib/api'

type RequestSummary = {
  requestId: string
  createdAt: string
  user: { id: string; name: string; avatarUrl: string | null }
}

export function RequestsPanel({
  incoming,
  outgoing,
}: {
  incoming: RequestSummary[]
  outgoing: RequestSummary[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function respond(
    request: RequestSummary,
    action: 'accept' | 'reject',
  ) {
    setPendingId(request.requestId)

    try {
      await apiFetch(`/api/friends/requests/${request.requestId}/${action}`, {
        method: 'POST',
      })

      toast(
        action === 'accept'
          ? `You and ${request.user.name} are now friends.`
          : `Request from ${request.user.name} declined.`,
        'success',
      )
      router.refresh()
    } catch (caught) {
      toast(
        caught instanceof ApiError ? caught.message : 'Could not respond.',
        'error',
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-ink">
          Received ({incoming.length})
        </h2>

        {incoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No pending requests"
              description="When someone asks to connect, their request will appear here."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {incoming.map((request) => (
              <li
                key={request.requestId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised px-4 py-3 shadow-card"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {request.user.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Sent {formatDate(request.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={pendingId === request.requestId}
                    onClick={() => respond(request, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respond(request, 'reject')}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">
          Sent ({outgoing.length})
        </h2>

        {outgoing.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            You have no requests waiting for a reply.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {outgoing.map((request) => (
              <li
                key={request.requestId}
                className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised px-4 py-3"
              >
                <span className="text-sm text-ink">{request.user.name}</span>
                <span className="text-xs text-ink-muted">
                  Waiting since {formatDate(request.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
