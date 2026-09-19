'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

/**
 * Toast notifications.
 *
 * The live region is `polite` and always present in the DOM, so screen
 * readers announce new messages instead of missing a region that appears at
 * the same moment as its content.
 */

type ToastTone = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  info: 'border-l-accent',
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      nextId += 1
      const id = nextId
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-l-4 border-border-subtle bg-surface-raised px-4 py-3 shadow-raised ${TONE_STYLES[item.tone]}`}
          >
            <p className="flex-1 text-sm text-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-m-1 rounded p-1 text-ink-faint hover:text-ink"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }
  return context
}
