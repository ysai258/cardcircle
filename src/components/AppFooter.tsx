import Link from 'next/link'

/**
 * The pinned footer.
 *
 * Lives outside the scrolling region, so it is always visible rather than
 * something you reach by scrolling to the end of a long card list.
 */
export function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-border-subtle bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-ink-muted">
          CardCircle stores no card number, CVV, expiry or last-4 — only which
          card someone holds.
        </p>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/privacy"
            className="inline-flex min-h-9 items-center px-1 text-ink-muted transition-colors hover:text-ink"
          >
            Privacy
          </Link>
          <span aria-hidden="true" className="text-ink-faint">
            ·
          </span>
          <a
            href="mailto:ysaimuppineni789@gmail.com?subject=CardCircle"
            className="inline-flex min-h-9 items-center gap-1.5 px-1 font-medium text-accent transition-colors hover:text-accent-hover"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5"
            >
              <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
              <path d="M3 6l7 5 7-5" />
            </svg>
            Contact us
          </a>
        </div>
      </div>
    </footer>
  )
}
