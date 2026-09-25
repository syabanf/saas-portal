import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'
import { Sheet, SheetContent, SheetTitle } from './sheet'

export interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wordmark or title row on the left of the close button. */
  header: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Phone navigation: a dark bottom sheet with a drag handle and a grid of tiles. */
export function MobileMenu({ open, onOpenChange, header, children, footer }: MobileMenuProps) {
  const labels = useUiLabels()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="safe-b bg-ink text-on-ink max-h-[85dvh] px-5 pt-3 pb-5"
      >
        <SheetTitle className="sr-only">{labels.menu}</SheetTitle>
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-white/20" />
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          {header}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={labels.closeMenu}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none]">
          {children}
        </div>
        {footer ? (
          <div className="mt-4 shrink-0 border-t border-white/10 pt-4">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function MobileMenuGroup({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label ? (
        <p className="text-on-ink-muted mb-2 text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  )
}

export interface MobileMenuItemRenderProps {
  className: string
  children: React.ReactNode
  'data-active': boolean
}

export interface MobileMenuItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
  /** Wrap in a router Link while keeping the classes here. */
  render?: (props: MobileMenuItemRenderProps) => React.ReactNode
}

export function MobileMenuItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
  render,
}: MobileMenuItemProps) {
  const className = cn(
    'relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/5 px-2 py-3 text-center text-[11px] font-semibold text-on-ink-muted transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-accent data-[active=true]:text-white data-[active=true]:shadow-glow [&_svg]:size-5',
  )
  const inner = (
    <>
      {icon}
      <span className="w-full truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="text-ink absolute top-2 right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  )
  if (render) return <>{render({ className, children: inner, 'data-active': active })}</>
  return (
    <button type="button" onClick={onClick} data-active={active} className={className}>
      {inner}
    </button>
  )
}
