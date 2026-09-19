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
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <SmartLink href="/" className="flex items-center gap-2 font-semibold text-ink">
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
        <nav aria-label="Main" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                    isActive(link.href)
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  {link.label}
                  {link.href === '/requests' && pendingRequests > 0 && (
                    <span className="grid size-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
                      {pendingRequests}
                      <span className="sr-only"> pending requests</span>
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
            className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
