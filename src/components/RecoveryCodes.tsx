'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Displays recovery codes.
 *
 * This is the only place codes are ever readable — they are stored hashed
 * and cannot be shown again. The copy is blunt about that, because a user
 * who skims past this screen has no way back into their account if they
 * forget their password.
 *
 * The codes are deliberately NOT written to localStorage. They are the
 * credential that resets a password; leaving a copy in the browser would
 * undo the point of hashing them server-side.
 */
export function RecoveryCodes({
  codes,
  onAcknowledge,
  acknowledgeLabel = 'I have saved these codes',
}: {
  codes: string[]
  onAcknowledge?: () => void
  acknowledgeLabel?: string
}) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const asText = [
    'CardCircle recovery codes',
    '',
    'Each code works once. Keep them somewhere safe and private —',
    'anyone holding one can reset your password.',
    '',
    ...codes,
    '',
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(asText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard access can be denied; the codes are on screen regardless.
      setCopied(false)
    }
  }

  function download() {
    const blob = new Blob([asText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cardcircle-recovery-codes.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
        <p className="text-sm font-medium text-warning">
          Save these now — you will not see them again.
        </p>
        <p className="mt-1 text-xs text-warning/90">
          CardCircle has no way to email or text you, so these codes are the
          only way back in if you forget your password. Each one works once.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border-subtle bg-surface-sunken p-3">
        {codes.map((code) => (
          <li
            key={code}
            className="numeric rounded bg-surface px-2 py-1.5 text-center text-sm tracking-wider text-ink"
          >
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={download}>
          Download .txt
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        Anyone who has one of these codes and your mobile number can reset your
        password. Treat them like a spare key.
      </p>

      {onAcknowledge && (
        <div className="space-y-3 border-t border-border-subtle pt-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span className="text-sm text-ink">
              I have saved my recovery codes somewhere safe.
            </span>
          </label>

          <Button
            type="button"
            onClick={onAcknowledge}
            disabled={!confirmed}
            className="w-full"
          >
            {acknowledgeLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
