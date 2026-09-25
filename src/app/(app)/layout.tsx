import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppFooter } from '@/components/AppFooter'
import { AppNav } from '@/components/AppNav'
import { getCurrentSessionWithBadge } from '@/server/modules/auth/session'

/**
 * Authenticated shell.
 *
 * The session is resolved here, on the server, for every page in this group.
 * This is a real gate rather than a UI nicety — but it is not the only one:
 * every service call independently authorises the acting user, so a page
 * that forgot to check still could not return another user's data.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getCurrentSessionWithBadge()
  if (!session) redirect('/login')

  const { user, pendingRequests } = session

  return (
    /**
     * A fixed-height column: header, scrolling middle, pinned footer.
     *
     * h-dvh rather than h-screen so mobile browsers' collapsing URL bar does
     * not leave the footer hanging below the fold. Only <main> scrolls —
     * body overflow is locked in globals.css.
     */
    <div className="flex h-dvh flex-col">
      <AppNav userName={user.name} pendingRequests={pendingRequests} />

      <main className="app-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
          {children}
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
