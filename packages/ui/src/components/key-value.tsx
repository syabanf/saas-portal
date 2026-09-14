import * as React from 'react'
import { cn } from '../lib/cn'

export interface KeyValueRow {
  label: string
  value: React.ReactNode
}

/** `dl` in a card with hairline dividers. `dense` is the admin variant. */
export function KeyValue({
  rows,
  dense = false,
  className,
}: {
  rows: KeyValueRow[]
  dense?: boolean
  className?: string
}) {
  return (
    <dl className={cn('divide-border divide-y', className)}>
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            'grid gap-3 text-sm',
            dense ? 'grid-cols-[120px_1fr] py-2' : 'grid-cols-[96px_1fr] py-3.5',
          )}
        >
          <dt className="text-muted">{r.label}</dt>
          <dd className="min-w-0 break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
