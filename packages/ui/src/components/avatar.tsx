import { cn } from '../lib/cn'

const SIZE = {
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-20 text-2xl',
} as const

export interface AvatarProps {
  initials: string
  color: string
  size?: keyof typeof SIZE
  className?: string
}

export function Avatar({ initials, color, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        SIZE[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
