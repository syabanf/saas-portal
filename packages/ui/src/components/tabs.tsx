import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'
import { cn } from '../lib/cn'

type Variant = 'pill' | 'underline'
const VariantContext = React.createContext<Variant>('pill')

export function Tabs({
  variant = 'pill',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { variant?: Variant }) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.Root {...props} />
    </VariantContext.Provider>
  )
}

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'pill'
          ? 'bg-card shadow-card flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]'
          : 'border-border flex w-full gap-6 overflow-x-auto border-b [scrollbar-width:none]',
        className,
      )}
      {...props}
    />
  )
})
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(VariantContext)
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'text-muted hover:text-foreground focus-visible:ring-accent inline-flex min-h-11 items-center gap-2 font-medium whitespace-nowrap transition-colors focus-visible:rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50',
        variant === 'pill'
          ? 'data-[state=active]:bg-ink data-[state=active]:text-on-ink rounded-full px-4 py-1.5 text-sm'
          : 'data-[state=active]:border-accent data-[state=active]:text-foreground -mb-px border-b-2 border-transparent py-3 text-sm font-semibold',
        className,
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  count?: number
  /** The one urgent tab renders accent when active; others render ink. */
  urgent?: boolean
}

/** Equal-width segmented pill with counts (mobile list tabs). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="View options"
      className={cn('bg-card shadow-card flex gap-1 rounded-full p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors sm:h-10',
              active
                ? o.urgent
                  ? 'bg-accent text-white'
                  : 'bg-ink text-on-ink'
                : 'text-muted hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] tabular-nums',
                  active ? 'bg-white/20' : 'bg-surface',
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Admin view switcher (Operations | Maintenance). */
export function ViewSwitcher<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="View options"
      className={cn(
        'bg-card shadow-card inline-flex max-w-full overflow-x-auto rounded-full p-1 [scrollbar-width:none]',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-11 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors sm:h-9',
            o.value === value ? 'bg-ink text-on-ink' : 'text-muted hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
