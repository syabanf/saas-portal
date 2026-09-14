import * as React from 'react'
import { cn } from '../lib/cn'

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  /** `ink` = selected chip in a scrolling mobile filter row. */
  activeTone?: 'accent' | 'ink'
  iconOnly?: boolean
}

export function Chip({
  active = false,
  activeTone = 'accent',
  iconOnly = false,
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      data-active={active}
      className={cn(
        'border-border bg-card text-body hover:bg-surface focus-visible:ring-accent inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:h-10 [&_svg]:size-4',
        activeTone === 'accent'
          ? 'data-[active=true]:border-accent data-[active=true]:bg-accent data-[active=true]:text-white'
          : 'data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-on-ink',
        iconOnly && 'w-10 justify-center px-0',
        className,
      )}
      {...props}
    />
  )
}

/** Horizontal chip row. `bleed` adds the mobile-only `-mx-5 px-5` overflow. */
export function ChipRow({
  bleed = false,
  className,
  children,
}: {
  bleed?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]',
        bleed && '-mx-5 px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
