import * as React from 'react'
import { cn } from '../lib/cn'

/** Phone bottom bar for the admin shell: `fixed inset-x-3 bottom-3 h-[68px] rounded-[22px] bg-ink`. */
export function BottomBar({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <nav
      className={cn(
        'bg-ink shadow-float fixed inset-x-3 bottom-3 z-40 flex h-[68px] items-center justify-between rounded-[22px] px-3 md:hidden',
        className,
      )}
    >
      {children}
    </nav>
  )
}

export interface BottomBarItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
  render?: (props: {
    className: string
    children: React.ReactNode
    'aria-current'?: 'page'
  }) => React.ReactNode
}

export function BottomBarItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
  render,
}: BottomBarItemProps) {
  const className = cn(
    'relative flex size-11 items-center justify-center rounded-2xl text-on-ink-muted transition-colors hover:text-white [&_svg]:size-5',
    active && 'bg-accent text-white shadow-glow',
  )
  const inner = (
    <>
      {icon}
      <span className="sr-only">{label}</span>
      {badge && badge > 0 ? (
        <span className="text-ink absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  )
  if (render)
    return (
      <>{render({ className, children: inner, 'aria-current': active ? 'page' : undefined })}</>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
      aria-pressed={active}
    >
      {inner}
    </button>
  )
}

/** Round accent Add button in the middle of the bottom bar. */
export function BottomBarAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bg-accent shadow-glow flex size-12 items-center justify-center rounded-full text-white transition-transform active:scale-95 [&_svg]:size-5"
    >
      {children}
    </button>
  )
}
