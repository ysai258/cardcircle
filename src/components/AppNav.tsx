'use client'

import { SmartLink } from '@/components/SmartLink'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useToast } from '@/components/ui/Toast'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/cards', label: 'My Cards' },
  { href: '/friends', label: 'Friends' },
  { href: '/requests', label: 'Requests' },
  { href: '/profile', label: 'Profile' },
] as const

export function AppNav({
  userName,
  pendingRequests,
}: {
  userName: string
  pendingRequests: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  async function signOut() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      toast('Could not sign out. Please try again.', 'error')
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <SmartLink
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2 font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-lg bg-accent text-sm text-accent-ink"
          >
            C
          </span>
          <span className="hidden sm:inline">CardCircle</span>
        </SmartLink>

        {/*
          min-w-0 is load-bearing: without it this flex child refuses to
          shrink below its content width, so the inner list's overflow-x-auto
          never engages and the whole page scrolls sideways on a phone.
        */}
        {/*
          The fade tells a phone user the strip scrolls. Without it the nav
          simply looks truncated, and Requests and Profile are unreachable
          because nothing suggests swiping.
        */}
        <nav aria-label="Main" className="relative min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden"
          />
          <ul className="flex items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    // min-h-11 ~= 44px, the smallest comfortable thumb
                    // target. These were 32px, which is a miss-prone tap.
                    'relative inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(link.href)
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  {link.label}
                  {link.href === '/requests' && pendingRequests > 0 && (
                    /**
                     * Deliberately loud. This is the app's only notification,
                     * and a friend request sitting unseen is the one thing
                     * that silently stops the product working: until it is
                     * accepted, neither person can see what the other shares.
                     */
                    <span className="relative flex">
                      <span
                        aria-hidden="true"
                        className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60"
                      />
                      <span className="relative grid size-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                        {pendingRequests > 9 ? '9+' : pendingRequests}
                        <span className="sr-only"> pending friend requests</span>
                      </span>
                    </span>
                  )}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-ink-muted sm:inline">
            {userName}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
