import * as React from 'react'
import { cn } from '../lib/cn'

export type StatTone = 'default' | 'danger' | 'success' | 'warning' | 'info' | 'ink'

const TILE: Record<StatTone, string> = {
  default: 'bg-surface text-body',
  danger: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  ink: 'bg-ink text-on-ink',
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: React.ReactNode
  tone?: StatTone
}

/** Label / value / hint on the left, a soft-tinted square icon tile top-right. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn('rounded-card bg-card shadow-card flex items-start gap-3 p-5', className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <p className="text-body/80 text-[13px] font-semibold">{label}</p>
        <p className="mt-1.5 truncate text-[28px] leading-[1.15] font-extrabold tracking-[-0.5px] tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-muted mt-1 text-xs">{hint}</p> : null}
      </div>
      <div
        className={cn(
          'flex size-[42px] shrink-0 items-center justify-center rounded-[13px] [&_svg]:size-[18px]',
          TILE[tone],
        )}
      >
        {icon}
      </div>
    </div>
  )
}

/** Soft-tinted square icon tile, reusable outside StatCard (gallery cards, inspector rows). */
export function IconTile({
  tone = 'default',
  size = 'md',
  className,
  children,
}: {
  tone?: StatTone
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  const dims =
    size === 'sm'
      ? 'size-9 rounded-xl [&_svg]:size-4'
      : size === 'lg'
        ? 'size-12 rounded-2xl [&_svg]:size-5'
        : 'size-[42px] rounded-[13px] [&_svg]:size-[18px]'
  return (
    <div className={cn('flex shrink-0 items-center justify-center', dims, TILE[tone], className)}>
      {children}
    </div>
  )
}

/** Mobile 3-up stat tile: big number, small label; tones ink / accent / card. */
export function MiniStat({
  value,
  label,
  tone = 'card',
  className,
}: {
  value: React.ReactNode
  label: string
  tone?: 'ink' | 'accent' | 'card'
  className?: string
}) {
  return (
    <div
      className={cn(
        'shadow-card rounded-[24px] px-4 py-5',
        tone === 'ink' && 'bg-ink text-on-ink',
        tone === 'accent' && 'bg-accent shadow-glow text-white',
        tone === 'card' && 'bg-card text-foreground',
        className,
      )}
    >
      <p className="text-[32px] leading-none font-bold tabular-nums">{value}</p>
      <p className={cn('mt-2 text-xs font-medium', tone === 'card' ? 'text-muted' : 'opacity-80')}>
        {label}
      </p>
    </div>
  )
}
