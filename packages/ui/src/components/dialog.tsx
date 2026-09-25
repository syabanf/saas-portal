import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'

const DialogFocusContext = React.createContext<React.MutableRefObject<HTMLElement | null> | null>(
  null,
)

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const returnFocus = React.useRef<HTMLElement | null>(null)
  const previousOpen = React.useRef(Boolean(open ?? defaultOpen))
  if (open !== undefined && open !== previousOpen.current) {
    if (open && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement
    previousOpen.current = open
  }
  return (
    <DialogFocusContext.Provider value={returnFocus}>
      <DialogPrimitive.Root
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
    </DialogFocusContext.Provider>
  )
}
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: keyof typeof SIZE }
>(({ className, children, size = 'md', onCloseAutoFocus, ...props }, ref) => {
  const returnFocus = React.useContext(DialogFocusContext)
  const labels = useUiLabels()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-ink/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
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
          'rounded-card bg-card shadow-float data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 focus:outline-none',
          SIZE[size],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="text-muted hover:bg-surface hover:text-foreground focus-visible:ring-accent absolute top-3 right-3 flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:top-4 sm:right-4 sm:size-8">
          <X className="size-4" />
          <span className="sr-only">{labels.close}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1 pr-6', className)} {...props} />
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}
export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg leading-tight font-semibold', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'
export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted text-sm', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'
