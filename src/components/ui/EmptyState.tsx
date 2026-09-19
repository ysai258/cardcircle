import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-(--radius-card) border border-dashed border-border-strong bg-surface-raised px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className ?? ''}`} />
}
