import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'

const SheetFocusContext = React.createContext<React.MutableRefObject<HTMLElement | null> | null>(null)

export function Sheet({ open, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const returnFocus = React.useRef<HTMLElement | null>(null)
  const previousOpen = React.useRef(Boolean(open ?? defaultOpen))
  if (open !== undefined && open !== previousOpen.current) {
    if (open && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
    previousOpen.current = open
  }
  return (
    <SheetFocusContext.Provider value={returnFocus}>
      <DialogPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={(next) => {
          if (next && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
          previousOpen.current = next
          onOpenChange?.(next)
        }}
        {...props}
      />
    </SheetFocusContext.Provider>
  )
}
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description

type Side = 'left' | 'right' | 'bottom'
const SIDE: Record<Side, string> = {
  right:
    'inset-y-0 right-0 h-full w-full max-w-xl border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  left: 'inset-y-0 left-0 h-full w-72 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  bottom:
    'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[28px] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: Side
    hideClose?: boolean
  }
>(({ className, children, side = 'right', hideClose = false, onCloseAutoFocus, ...props }, ref) => {
  const returnFocus = React.useContext(SheetFocusContext)
  return <DialogPrimitive.Portal>
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
        'bg-card shadow-float data-[state=closed]:animate-out data-[state=open]:animate-in fixed z-50 flex flex-col overflow-y-auto transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
        SIDE[side],
        className,
      )}
      {...props}
    >
      {children}
      {hideClose ? null : (
        <DialogPrimitive.Close className="text-muted hover:bg-surface hover:text-foreground focus-visible:ring-accent absolute top-3 right-3 flex size-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:top-4 sm:right-4 sm:size-8">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
})
SheetContent.displayName = 'SheetContent'
