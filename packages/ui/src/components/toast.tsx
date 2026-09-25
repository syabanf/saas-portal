import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'
import { Button } from './button'

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends ToastOptions {
  id: string
}

const EVENT = 'scp:toast'

export function pushToast(options: ToastOptions) {
  window.dispatchEvent(new CustomEvent<ToastOptions>(EVENT, { detail: options }))
}

export function ToastProvider() {
  const labels = useUiLabels()
  const [items, setItems] = React.useState<ToastItem[]>([])

  React.useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastOptions>).detail
      const id = `${Date.now()}-${Math.random()}`
      setItems((current) => [...current.slice(-3), { ...detail, id }])
      window.setTimeout(
        () => setItems((current) => current.filter((item) => item.id !== id)),
        detail.duration ?? (detail.action ? 8000 : 4500),
      )
    }
    window.addEventListener(EVENT, onToast)
    return () => window.removeEventListener(EVENT, onToast)
  }, [])

  function dismiss(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 md:bottom-5">
      {items.map((item) => {
        const Icon =
          item.tone === 'warning' || item.tone === 'danger'
            ? AlertTriangle
            : item.tone === 'info'
              ? Info
              : CheckCircle2
        return (
          <div
            key={item.id}
            role={item.tone === 'danger' ? 'alert' : 'status'}
            aria-atomic="true"
            className="border-border bg-card shadow-card pointer-events-auto flex items-start gap-3 rounded-2xl border p-3"
          >
            <Icon
              className={cn(
                'mt-0.5 size-5 shrink-0',
                item.tone === 'danger' && 'text-danger',
                item.tone === 'warning' && 'text-warning',
                item.tone === 'info' && 'text-info',
                (!item.tone || item.tone === 'success') && 'text-success',
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="text-muted mt-0.5 text-xs">{item.description}</p>
              ) : null}
              {item.action ? (
                <button
                  type="button"
                  className="text-accent mt-1 inline-flex min-h-11 items-center text-xs font-semibold hover:underline sm:min-h-8"
                  onClick={() => {
                    item.action?.onClick()
                    dismiss(item.id)
                  }}
                >
                  {item.action.label}
                </button>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.dismiss}
              onClick={() => dismiss(item.id)}
            >
              <X />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
