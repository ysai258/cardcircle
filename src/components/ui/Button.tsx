import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover border-transparent shadow-card',
  secondary:
    'bg-surface-raised text-ink border-border-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-ink-muted border-transparent hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger-soft text-danger border-transparent hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      // Announces the pending state to screen readers, not just visually.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-medium',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
