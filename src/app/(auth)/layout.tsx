import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getCurrentUser } from '@/server/modules/auth/session'

export default async function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  // Already signed in? The sign-in page has nothing to offer.
  if (await getCurrentUser()) redirect('/')

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-lg font-semibold text-accent-ink"
          >
            C
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">CardCircle</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Know who has the card you need.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
