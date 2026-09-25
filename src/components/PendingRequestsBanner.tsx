import Link from 'next/link'

/**
 * Surfaces waiting friend requests the moment the app opens.
 *
 * The nav badge is easy to walk past, and an unanswered request is the one
 * thing that quietly stops CardCircle working: until it is accepted, neither
 * person can see what the other shares. So it gets said out loud, with the
 * names, above everything else.
 */
export function PendingRequestsBanner({
  requests,
}: {
  requests: Array<{ requestId: string; user: { id: string; name: string } }>
}) {
  if (requests.length === 0) return null

  const names = requests.map((request) => request.user.name)
  const shown = names.slice(0, 3).join(', ')
  const extra = names.length - 3

  return (
    <Link
      href="/requests"
      className="group flex items-center gap-3 rounded-(--radius-card) border-2 border-accent/30 bg-accent-soft px-4 py-3 transition-all hover:border-accent/60 hover:shadow-card"
    >
      <span className="relative flex shrink-0">
        <span
          aria-hidden="true"
          className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-50"
        />
        <span className="relative grid size-8 place-items-center rounded-full bg-danger text-sm font-bold text-white">
          {requests.length}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">
          {requests.length === 1
            ? '1 friend request waiting'
            : `${requests.length} friend requests waiting`}
        </span>
        <span className="block truncate text-xs text-ink-muted">
          From {shown}
          {extra > 0 && ` and ${extra} other${extra === 1 ? '' : 's'}`} — accept
          to see the cards they share.
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 text-sm font-semibold text-accent transition-transform group-hover:translate-x-0.5"
      >
        Review →
      </span>
    </Link>
  )
}
