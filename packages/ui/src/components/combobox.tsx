import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary line under the label (email, code, price). */
  hint?: string
  group?: string
  disabled?: boolean
}

export interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  /** Text shown when the search finds nothing. */
  emptyText?: string
  disabled?: boolean
  /** Adds an "×" that resets to ''. */
  clearable?: boolean
  /** `nested` = inside a white card; `ghost` = inline list filter pill. */
  tone?: 'default' | 'nested' | 'ghost'
  id?: string
  className?: string
  /** Rendered under the option list, for example a "Create new" action. */
  footer?: React.ReactNode
  'aria-label'?: string
}

/** Below `md` the panel opens as a bottom sheet so the keyboard never covers the list. */
function useIsPhone(): boolean {
  const [phone, setPhone] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return phone
}

function normalise(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Searchable dropdown. Replaces the native select wherever the list can grow. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  disabled = false,
  clearable = false,
  tone = 'default',
  id,
  className,
  footer,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  const filtered = React.useMemo(() => {
    const q = normalise(query.trim())
    if (!q) return options
    return options.filter((o) =>
      normalise(`${o.label} ${o.hint ?? ''} ${o.group ?? ''}`).includes(q),
    )
  }, [options, query])

  const groups = React.useMemo(() => {
    const out = new Map<string, ComboboxOption[]>()
    for (const o of filtered) {
      const key = o.group ?? ''
      const bucket = out.get(key)
      if (bucket) bucket.push(o)
      else out.set(key, [o])
    }
    return Array.from(out.entries())
  }, [filtered])

  const listId = React.useId()
  React.useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    )
  }, [open, options, value])

  React.useEffect(() => {
    setActive(0)
  }, [query])

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function choose(option: ComboboxOption) {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = filtered[active]
      if (option) choose(option)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const triggerClass =
    tone === 'ghost'
      ? 'h-8 gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-body hover:bg-surface'
      : cn(
          'h-11 w-full gap-2 rounded-2xl border border-border bg-card px-4 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20',
          tone === 'nested' && 'border-0 bg-surface',
          disabled && 'bg-surface text-muted',
        )

  const phone = useIsPhone()
  const labels = useUiLabels()
  const trigger = (
    <button
      id={id}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-between text-left focus:outline-none disabled:pointer-events-none',
        triggerClass,
        clearable && value && tone !== 'ghost' && 'pr-10',
      )}
    >
      <span
        className={cn('min-w-0 flex-1 truncate', !selected && tone !== 'ghost' && 'text-muted')}
      >
        {selected?.label ?? placeholder}
      </span>
      <ChevronDown
        className={cn('text-muted shrink-0', tone === 'ghost' ? 'size-3.5' : 'size-4')}
      />
    </button>
  )
  const panel = (
    <>
      <div className="bg-surface flex h-11 items-center gap-2 rounded-xl px-3">
        <Search className="text-muted size-4 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={ariaLabel ? `Search ${ariaLabel}` : searchPlaceholder}
          aria-controls={listId}
          aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
          className="placeholder:text-muted h-full min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        {options.length > 20 ? (
          <span className="text-muted shrink-0 text-xs tabular-nums">
            {filtered.length} of {options.length}
          </span>
        ) : null}
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        className="mt-1.5 max-h-[50dvh] overflow-y-auto [scrollbar-width:thin] md:max-h-64"
      >
        {filtered.length === 0 ? (
          <p className="text-muted px-3 py-6 text-center text-sm">
            {emptyText}
            {query.trim() ? ` for “${query.trim()}”` : ''}
          </p>
        ) : null}
        {groups.map(([group, items]) => (
          <div key={group}>
            {group ? (
              <p className="text-muted px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {group}
              </p>
            ) : null}
            {items.map((o) => {
              const index = filtered.indexOf(o)
              const isSelected = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  disabled={o.disabled}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(o)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
                    index === active && 'bg-surface',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.label}</span>
                    {o.hint ? (
                      <span className="text-muted block truncate text-xs">{o.hint}</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="text-accent size-4 shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {footer ? <div className="border-border mt-1.5 border-t pt-1.5">{footer}</div> : null}
    </>
  )

  if (phone) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <div className={cn('relative', tone === 'ghost' ? 'inline-flex' : 'flex', className)}>
          <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
          {clearable && value && tone !== 'ghost' && !disabled ? (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={labels.clear}
              className="text-muted hover:bg-surface hover:text-foreground absolute top-1/2 right-9 flex size-6 -translate-y-1/2 items-center justify-center rounded-full"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="bg-ink/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[2px]" />
          <DialogPrimitive.Content
            onKeyDown={onKeyDown}
            className="bg-card shadow-float safe-b data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col rounded-t-[28px] p-3 pt-2 focus:outline-none"
          >
            <DialogPrimitive.Title className="sr-only">
              {ariaLabel ?? placeholder}
            </DialogPrimitive.Title>
            <div className="bg-border mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full" />
            {panel}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative', tone === 'ghost' ? 'inline-flex' : 'flex', className)}>
        <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
        {clearable && value && tone !== 'ghost' && !disabled ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={labels.clear}
            className="text-muted hover:bg-surface hover:text-foreground absolute top-1/2 right-9 flex size-6 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          onKeyDown={onKeyDown}
          className="bg-card shadow-float data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-[var(--radix-popover-trigger-width)] min-w-[14rem] rounded-2xl p-1.5"
        >
          {panel}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
