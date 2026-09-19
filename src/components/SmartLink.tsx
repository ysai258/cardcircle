'use client'

import Link from 'next/link'
import type { LinkProps } from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

/**
 * A Link that prefetches on intent rather than on sight.
 *
 * Next prefetches every <Link> as it enters the viewport. On this app that
 * meant a single page load fired 13 prefetches, each a serverless invocation
 * opening its own connection. Against a warm database that is merely
 * wasteful; against a suspended one — the free tier suspends after a few
 * minutes idle — thirteen connections all try to wake it at once and the
 * page appears to hang for a minute.
 *
 * Deferring to hover/focus targets only the links someone is actually about
 * to click, so the wake-up cost is paid once instead of thirteen times.
 * Keyboard users get the same benefit via onFocus.
 */
export function SmartLink({
  children,
  ...props
}: LinkProps & {
  children: ReactNode
  className?: string
  'aria-current'?: 'page' | undefined
}) {
  const [shouldPrefetch, setShouldPrefetch] = useState(false)

  return (
    <Link
      {...props}
      // `false` disables viewport prefetching; flipping to undefined on
      // intent restores Next's default behaviour for that one link.
      prefetch={shouldPrefetch ? undefined : false}
      onMouseEnter={() => setShouldPrefetch(true)}
      onFocus={() => setShouldPrefetch(true)}
      onTouchStart={() => setShouldPrefetch(true)}
    >
      {children}
    </Link>
  )
}
