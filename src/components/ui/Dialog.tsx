'use client'

import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * An accessible modal dialog.
 *
 * Hand-rolled rather than pulled from a component library, because the
 * behaviour here is small enough to own and the details are the whole point:
 *
 *   - role="dialog" + aria-modal, labelled by its own heading
 *   - focus moves into the dialog on open and returns to the trigger on close
 *   - Tab and Shift+Tab cycle within the dialog, never behind it
 *   - Escape closes, as does a click on the backdrop
 *   - background scrolling is locked while open
 *
 * A dialog that traps a keyboard user, or drops their focus to the top of
 * the page on close, is not usable — and this one shows card details, so it
 * needs to work for everyone.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement

      // Wrap at both ends so focus cannot escape to the page behind.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE)
    // Fall back to the panel itself so focus never stays behind the backdrop.
    ;(firstFocusable ?? panel)?.focus()

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        // Only a press that starts on the backdrop closes, so a drag that
        // ends outside the panel does not dismiss it accidentally.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-surface-raised shadow-raised outline-none sm:rounded-(--radius-card)"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A confirmation dialog for destructive actions.
 *
 * Deleting a card and blocking a user are both irreversible enough to
 * deserve a deliberate second step.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  pending = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-lg border border-border-strong bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
            className="inline-flex h-10 items-center rounded-lg bg-danger px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">{description}</p>
    </Dialog>
  )
}
