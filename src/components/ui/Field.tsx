'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-ink ' +
  'placeholder:text-ink-faint transition-colors focus:border-accent disabled:opacity-60'

type FieldShellProps = {
  label: string
  hint?: ReactNode
  error?: string
  children: (props: { id: string; describedBy: string | undefined }) => ReactNode
}

/**
 * Label + hint + error wrapper.
 *
 * Wires `aria-describedby` to both the hint and the error, and marks the
 * error with role="alert" so a screen reader announces a validation failure
 * rather than leaving it as silent red text.
 */
function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy })}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: ReactNode
  error?: string
}

export function TextField({ label, hint, error, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, error && 'border-danger', className)}
        />
      )}
    </FieldShell>
  )
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <select
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, error && 'border-danger', className)}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
}
