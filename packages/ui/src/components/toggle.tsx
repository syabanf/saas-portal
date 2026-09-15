import { cn } from '../lib/cn'

export interface ToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export function Toggle({ checked, onCheckedChange, disabled, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'focus-visible:ring-accent relative inline-flex h-11 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 sm:h-7',
        checked ? 'bg-accent' : 'bg-silver/60',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

/** A labelled toggle row for dialogs and settings (`rounded-2xl bg-surface px-3 py-2`). */
export function ToggleRow({
  title,
  description,
  ...toggle
}: ToggleProps & { title: string; description?: string }) {
  return (
    <div className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-muted text-xs">{description}</p> : null}
      </div>
      <Toggle label={title} {...toggle} />
    </div>
  )
}
