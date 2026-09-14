import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface text-body',
        accent: 'bg-accent text-white',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        muted: 'bg-surface text-muted',
        outline: 'border border-border text-foreground',
        ink: 'bg-ink text-on-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

/** Small numbered counter used on nav items and tabs. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'bg-accent ring-card flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

const DOT_TONE: Record<BadgeTone, string> = {
  default: 'bg-body',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  muted: 'bg-muted',
  outline: 'bg-foreground',
  ink: 'bg-ink',
}

/** Status text with a coloured dot, for card corners and list rows. */
export function StatusDot({
  tone,
  label,
  pulse = false,
  className,
}: {
  tone: BadgeTone
  label: string
  pulse?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold', className)}>
      <span className={cn('size-1.5 rounded-full', DOT_TONE[tone], pulse && 'animate-pulse')} />
      {label}
    </span>
  )
}
