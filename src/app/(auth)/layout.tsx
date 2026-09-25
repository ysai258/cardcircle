import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppFooter } from '@/components/AppFooter'
import { getCurrentUser } from '@/server/modules/auth/session'

export default async function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  // Already signed in? The sign-in page has nothing to offer.
  if (await getCurrentUser()) redirect('/')

  return (
    <div className="flex h-dvh flex-col">
      <main className="app-scroll flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <div
                aria-hidden="true"
                className="mx-auto grid size-12 place-items-center rounded-2xl border-2 border-ink bg-accent text-lg font-bold text-accent-ink shadow-pop"
              >
                C
              </div>
              <h1 className="mt-4 text-2xl font-bold text-ink">CardCircle</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Know who has the card you need.
              </p>
            </div>
            {children}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
