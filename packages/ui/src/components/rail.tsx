import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

const RailContext = React.createContext<{ expanded: boolean }>({ expanded: false })
export const useRail = () => React.useContext(RailContext)

export interface RailProps {
  expanded: boolean
  onToggle: () => void
  header: React.ReactNode
  action?: React.ReactNode
  workspace?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/** Floating dark rail: wordmark, round accent create button, grouped nav, workspace card, collapse pill. */
export function Rail({
  expanded,
  onToggle,
  header,
  action,
  workspace,
  children,
  className,
}: RailProps) {
  return (
    <RailContext.Provider value={{ expanded }}>
      <aside
        className={cn(
          'bg-ink text-on-ink shadow-float flex h-full flex-col rounded-[28px] py-4 transition-[width] duration-200',
          expanded ? 'w-60 px-3' : 'w-[76px] items-center px-0',
          className,
        )}
      >
        <div className={cn('flex items-center', expanded ? 'gap-3 px-2' : 'justify-center')}>
          {header}
        </div>
        {action ? (
          <div className={cn('mt-4 flex', expanded ? 'px-2' : 'justify-center')}>{action}</div>
        ) : null}
        <nav
          className={cn(
            'mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:none]',
            expanded ? 'w-full' : 'items-center',
          )}
        >
          {children}
        </nav>
        {workspace ? <div className={cn('mt-3', expanded ? 'w-full' : '')}>{workspace}</div> : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'text-on-ink-muted mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/10 text-xs font-semibold transition-colors hover:bg-white/10 hover:text-white',
            expanded ? 'h-10 w-full' : 'size-11',
          )}
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
        >
          {expanded ? (
            <>
              <ChevronLeft className="size-4" /> Collapse menu
            </>
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      </aside>
    </RailContext.Provider>
  )
}

export interface RailItemRenderProps {
  className: string
  children: React.ReactNode
  'data-active': boolean
  'aria-current'?: 'page'
}

export interface RailItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
  sub?: boolean
  /** Wrap in a router Link while keeping the classes and data attributes here. */
  render?: (props: RailItemRenderProps) => React.ReactNode
}

export function RailItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
  sub = false,
  render,
}: RailItemProps) {
  const { expanded } = useRail()
  const className = cn(
    'relative flex items-center rounded-2xl text-on-ink-muted transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-accent data-[active=true]:text-white data-[active=true]:shadow-glow [&_svg]:size-5 [&_svg]:shrink-0',
    expanded
      ? sub
        ? 'h-11 w-full gap-3 pl-11 pr-3 text-[13px] font-medium md:h-9'
        : 'h-11 w-full gap-3 px-3 text-sm font-semibold'
      : 'size-11 justify-center',
  )
  const inner = (
    <>
      {sub && expanded ? null : icon}
      {expanded ? <span className="truncate">{label}</span> : null}
      {badge && badge > 0 ? (
        <span
          className={cn(
            'text-ink flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold',
            expanded ? 'ml-auto' : 'absolute -top-1 -right-1',
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </>
  )
  const node = render ? (
    render({ className, children: inner, 'data-active': active, 'aria-current': active ? 'page' : undefined })
  ) : (
    <button type="button" onClick={onClick} data-active={active} aria-pressed={active} className={className}>
      {inner}
    </button>
  )
  if (expanded) return node
  return (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export interface RailGroupProps {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}

/** Collapsible group. Collapsed rail shows only a hairline between groups. */
export function RailGroup({ label, children, defaultOpen = true }: RailGroupProps) {
  const { expanded } = useRail()
  const [open, setOpen] = React.useState(defaultOpen)
  if (!expanded) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-white/10 pt-2 first:border-0 first:pt-0">
        {children}
      </div>
    )
  }
  return (
    <div className="mt-2 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-on-ink-muted/80 flex h-11 w-full items-center justify-between px-3 text-[11px] font-semibold tracking-wider uppercase hover:text-white md:h-8"
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open ? <div className="flex flex-col gap-0.5">{children}</div> : null}
    </div>
  )
}

/** Round accent create button under the wordmark. */
export function RailAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  const { expanded } = useRail()
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'bg-accent text-on-ink flex items-center justify-center gap-2 rounded-full shadow-[0_6px_18px_rgb(237_28_36_/_0.45)] transition-transform hover:-translate-y-px hover:scale-105 [&_svg]:size-5',
        expanded ? 'h-11 w-full px-4 text-sm font-semibold' : 'size-11',
      )}
      aria-label={label}
    >
      {children}
      {expanded ? <span>{label}</span> : null}
    </button>
  )
  if (expanded) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export interface RailWorkspaceProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  kicker: string
  name: string
}

/** Dark inset workspace card; collapses to the white tile alone. */
export const RailWorkspace = React.forwardRef<HTMLButtonElement, RailWorkspaceProps>(
  ({ icon, kicker, name, className, ...props }, ref) => {
    const { expanded } = useRail()
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex items-center gap-3 rounded-2xl text-left transition-colors hover:bg-white/10',
          expanded ? 'bg-ink-2 w-full border border-white/10 p-2.5' : 'size-11 justify-center',
          className,
        )}
        {...props}
      >
        <span className="bg-card text-ink flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4">
          {icon}
        </span>
        {expanded ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="text-on-ink-muted block text-[10.5px] font-semibold">{kicker}</span>
              <span className="block truncate text-[12.5px] font-bold">{name}</span>
            </span>
            <ChevronsUpDown className="text-on-ink-muted size-4 shrink-0" />
          </>
        ) : null}
      </button>
    )
  },
)
RailWorkspace.displayName = 'RailWorkspace'
