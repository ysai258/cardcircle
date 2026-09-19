import { Skeleton } from '@/components/ui/EmptyState'

/**
 * Shown while a page's data loads.
 *
 * This matters more than usual here: the free-tier database suspends when
 * idle, so the first navigation after a quiet spell can wait seconds for it
 * to wake. Without a boundary the browser simply sits on the old page and
 * the app looks broken. With one, navigation is instant and the content
 * fills in.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  )
}
