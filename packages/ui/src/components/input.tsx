import * as React from 'react'
import { cn } from '../lib/cn'

const inputBase =
  'h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface disabled:text-muted'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightSlot?: React.ReactNode
  error?: boolean
  /** `nested` = inside a white card: no border, surface fill. */
  tone?: 'default' | 'nested'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightSlot, error, tone = 'default', ...props }, ref) => (
    <div className={cn('relative flex items-center', className)}>
      {leftIcon ? (
        <span className="text-muted pointer-events-none absolute left-3 [&_svg]:size-4">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          inputBase,
          tone === 'nested' && 'bg-surface border-0',
          leftIcon && 'pl-10',
          rightSlot && 'pr-11',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
        )}
        {...props}
      />
      {rightSlot ? <span className="absolute right-2 flex items-center">{rightSlot}</span> : null}
    </div>
  ),
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: 'default' | 'nested'
  error?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, tone = 'default', error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        inputBase,
        'min-h-28 py-3',
        tone === 'nested' && 'bg-surface border-0',
        error && 'border-danger',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium', className)} {...props} />
}

export interface FormFieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}

export function FormField({ label, htmlFor, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-danger mt-1 text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/** Radio-style option card used in wizards ("How should users enter this application?"). */
export interface OptionCardProps {
  selected: boolean
  title: string
  description?: string
  badge?: React.ReactNode
  onSelect: () => void
  disabled?: boolean
}

export function OptionCard({
  selected,
  title,
  description,
  badge,
  onSelect,
  disabled,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      data-selected={selected}
      className="border-border bg-card hover:bg-surface data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft/40 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:opacity-50"
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-accent' : 'border-silver',
        )}
      >
        {selected ? <span className="bg-accent size-2.5 rounded-full" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {title}
          {badge}
        </span>
        {description ? (
          <span className="text-muted mt-0.5 block text-xs">{description}</span>
        ) : null}
      </span>
    </button>
  )
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-border focus:ring-accent size-6 shrink-0 rounded-[5px] accent-[var(--color-accent)] focus:ring-2 focus:ring-offset-2 sm:size-4',
        className,
      )}
      {...props}
    />
  )
}
