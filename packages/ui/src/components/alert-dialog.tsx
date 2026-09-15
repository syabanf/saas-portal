import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { cn } from '../lib/cn'
import { buttonVariants } from './button'

const AlertFocusContext = React.createContext<React.MutableRefObject<HTMLElement | null> | null>(
  null,
)

export function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  const returnFocus = React.useRef<HTMLElement | null>(null)
  const previousOpen = React.useRef(Boolean(open ?? defaultOpen))
  if (open !== undefined && open !== previousOpen.current) {
    if (open && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement
    previousOpen.current = open
  }
  return (
    <AlertFocusContext.Provider value={returnFocus}>
      <AlertDialogPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={(next) => {
          if (next && document.activeElement instanceof HTMLElement)
            returnFocus.current = document.activeElement
          previousOpen.current = next
          onOpenChange?.(next)
        }}
        {...props}
      />
    </AlertFocusContext.Provider>
  )
}
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, onCloseAutoFocus, ...props }, ref) => {
  const returnFocus = React.useContext(AlertFocusContext)
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="bg-ink/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[2px]" />
      <AlertDialogPrimitive.Content
        ref={ref}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (!event.defaultPrevented && returnFocus?.current?.isConnected) {
            event.preventDefault()
            returnFocus.current.focus({ preventScroll: true })
          } else if (!event.defaultPrevented) {
            const main = document.querySelector<HTMLElement>('main')
            if (main) {
              event.preventDefault()
              main.focus({ preventScroll: true })
            }
          }
        }}
        className={cn(
          'rounded-card bg-card shadow-float data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
})
AlertDialogContent.displayName = 'AlertDialogContent'

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />
}
export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}
export const AlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'
export const AlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-muted text-sm', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = 'AlertDialogDescription'
export const AlertDialogAction = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: 'danger' }), className)}
    {...props}
  />
))
AlertDialogAction.displayName = 'AlertDialogAction'
export const AlertDialogCancel = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline' }), className)}
    {...props}
  />
))
AlertDialogCancel.displayName = 'AlertDialogCancel'

/** Shared destructive confirmation: one sentence of consequence, Cancel + red action. */
export interface ConfirmDeleteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  actionLabel?: string
  onConfirm: () => void
}

export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = 'Delete',
  onConfirm,
}: ConfirmDeleteProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
