import * as React from 'react'
import { cn } from '../lib/cn'

export interface TimelineItem {
  id: string
  when: string
  title: string
  note?: string | null
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'info'
}

const DOT = {
  default: 'bg-silver',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
}

/** Vertical timeline for subscription history (blueprint §47). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('border-border relative space-y-0 border-l pl-5', className)}>
      {items.map((it) => (
        <li key={it.id} className="relative py-2.5">
          <span
            className={cn(
              'ring-card absolute top-[15px] -left-[25px] size-2.5 rounded-full ring-4',
              DOT[it.tone ?? 'default'],
            )}
          />
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">{it.when}</p>
          <p className="text-sm font-semibold">{it.title}</p>
          {it.note ? <p className="text-muted text-xs">{it.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}

/** Inspector-style setting row: icon tile · bold title · muted subtitle · chevron. */
export function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
  unsaved,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  trailing?: React.ReactNode
  unsaved?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="border-border hover:bg-surface-2 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors"
    >
      <span className="bg-surface relative flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4">
        {icon}
        {unsaved ? (
          <span className="bg-accent ring-card absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        {subtitle ? <span className="text-muted block truncate text-xs">{subtitle}</span> : null}
      </span>
      {trailing}
    </Comp>
  )
}
