import { cn } from '../lib/cn'

export interface SplitStat {
  label: string
  value: React.ReactNode
}

/** 2–4 equal cells flush with the card edge. Place as the last child of CardContent. */
export function SplitStats({ items, className }: { items: SplitStat[]; className?: string }) {
  const cols =
    items.length === 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
  return (
    <div
      className={cn(
        'divide-border border-border -mx-5 mt-auto -mb-5 grid divide-x border-t',
        cols,
        className,
      )}
    >
      {items.map((s) => (
        <div key={s.label} className="px-2 py-3 text-center">
          <span className="text-muted block text-[10.5px] font-medium">{s.label}</span>
          <span className="block text-[15px] font-extrabold tabular-nums">{s.value}</span>
        </div>
      ))}
    </div>
  )
}
