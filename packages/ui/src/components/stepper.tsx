import { Check } from 'lucide-react'
import { cn } from '../lib/cn'

export interface StepperProps {
  steps: string[]
  current: number
  onSelect?: (index: number) => void
  /** Let the user jump to steps after the current one (edit mode). */
  allowForward?: boolean
  className?: string
}

/** Pill stepper: current = ink, done = white with green check tile, upcoming = surface. */
export function Stepper({
  steps,
  current,
  onSelect,
  allowForward = false,
  className,
}: StepperProps) {
  return (
    <ol
      className={cn(
        'grid gap-2',
        steps.length === 6
          ? 'grid-cols-3 md:grid-cols-6'
          : steps.length === 5
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
            : 'grid-cols-2 md:grid-cols-4',
        className,
      )}
    >
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label}>
            <button
              type="button"
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${i + 1} of ${steps.length}: ${label}, ${active ? 'current' : done ? 'complete' : 'upcoming'}`}
              disabled={!onSelect || (!allowForward && i > current)}
              onClick={() => onSelect?.(i)}
              className={cn(
                'flex h-11 w-full items-center gap-2 rounded-full px-2 text-left text-xs font-semibold transition-colors disabled:cursor-default',
                active && 'bg-ink text-on-ink',
                done && 'bg-card text-foreground shadow-card',
                !active && !done && 'bg-surface-2 text-muted',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums',
                  active && 'bg-white/15',
                  done && 'bg-success-soft text-success',
                  !active && !done && 'bg-card',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
