import { cn } from '../lib/cn'

export interface ProgressBarProps {
  value: number
  max?: number
  /** `onDark` = thin white bar on an accent/ink card. */
  tone?: 'accent' | 'ink' | 'success' | 'warning' | 'onDark'
  className?: string
}

export function ProgressBar({ value, max = 100, tone = 'accent', className }: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.max(0, Math.min(max, value))}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full',
        tone === 'onDark' ? 'bg-white/25' : 'bg-surface',
        className,
      )}
    >
      <div aria-hidden="true"
        className={cn(
          'h-full rounded-full transition-[width]',
          tone === 'onDark' && 'bg-white',
          tone === 'accent' && 'bg-accent',
          tone === 'ink' && 'bg-ink',
          tone === 'success' && 'bg-success',
          tone === 'warning' && 'bg-warning',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
