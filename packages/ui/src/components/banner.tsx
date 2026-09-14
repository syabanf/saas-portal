import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Button } from './button'

export interface BannerProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  onDismiss?: () => void
  tone?: 'info' | 'warning' | 'danger' | 'success'
  className?: string
}

const TONE = {
  info: 'bg-info-soft [&_.tile]:text-info',
  warning: 'bg-warning-soft [&_.tile]:text-warning',
  danger: 'bg-accent-soft [&_.tile]:text-accent',
  success: 'bg-success-soft [&_.tile]:text-success',
}

/** Soft callout: round white icon tile, bold lead-in, muted copy, small CTA. */
export function Banner({
  icon,
  title,
  description,
  action,
  onDismiss,
  tone = 'info',
  className,
}: BannerProps) {
  return (
    <div
      className={cn(
        'rounded-card flex flex-wrap items-center gap-3 px-4 py-3',
        TONE[tone],
        className,
      )}
    >
      <div className="tile bg-card flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4">
        {icon}
      </div>
      <p className="min-w-[12rem] flex-1 text-sm">
        <span className="font-semibold">{title}</span>
        {description ? <span className="text-body/70"> {description}</span> : null}
      </p>
      {action}
      {onDismiss ? (
        <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss">
          <X />
        </Button>
      ) : null}
    </div>
  )
}
