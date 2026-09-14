import { Banner, cn } from '@scp/ui'
import { Check, CheckCircle2, Loader2 } from 'lucide-react'
import * as React from 'react'

const CHECKS = [
  'Application reachable',
  'Client credentials valid',
  'Token generated',
  'Signature valid',
  'Audience valid',
  'Redirect URI valid',
  'Webhook reachable',
]
const STAGGER_MS = 350

/** Reveals each check as passed with a stagger; reports when the whole list is green (blueprint §33 step 6). */
export function TestConnectionStep({ onComplete }: { onComplete: (ready: boolean) => void }) {
  const [passed, setPassed] = React.useState(0)

  React.useEffect(() => {
    setPassed(0)
    onComplete(false)
    const timers = CHECKS.map((_, i) =>
      window.setTimeout(
        () => {
          setPassed(i + 1)
          if (i === CHECKS.length - 1) onComplete(true)
        },
        STAGGER_MS * (i + 1),
      ),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onComplete])

  const ready = passed === CHECKS.length

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {CHECKS.map((label, i) => {
          const done = i < passed
          const running = i === passed
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                done ? 'bg-success-soft/50' : 'bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4',
                  done ? 'bg-success text-white' : 'bg-card text-muted',
                )}
              >
                {done ? (
                  <Check />
                ) : running ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <span className="bg-silver size-1.5 rounded-full" />
                )}
              </span>
              <span className={cn('font-medium', !done && !running && 'text-muted')}>{label}</span>
            </li>
          )
        })}
      </ul>
      {ready ? (
        <Banner
          tone="success"
          icon={<CheckCircle2 />}
          title="Application is ready."
          description="Every check passed. Create the application to receive its production client."
        />
      ) : (
        <p className="text-muted text-xs">
          Running checks against the application URL and the platform…
        </p>
      )}
    </div>
  )
}
