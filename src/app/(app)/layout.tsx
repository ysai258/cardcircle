import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppNav } from '@/components/AppNav'
import { getCurrentUser } from '@/server/modules/auth/session'
import { countIncomingRequests } from '@/server/modules/friends/service'

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
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const pendingRequests = await countIncomingRequests(user.id)

  return (
    <div className="flex min-h-full flex-col">
      <AppNav userName={user.name} pendingRequests={pendingRequests} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-border-subtle px-4 py-5 text-center text-xs text-ink-faint">
        CardCircle never stores full card numbers, CVVs, PINs or OTPs.
      </footer>
    </div>
  )
}
