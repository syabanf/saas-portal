import { fmtDateTime, fmtMs } from '@scp/fixtures'
import {
  Button,
  CodeBlock,
  KeyValue,
  Kicker,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@scp/ui'
import { RotateCcw } from 'lucide-react'
import { useCurrentUser } from '../../auth/auth'
import { DeliveryBadge, Mono } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'

export interface DeliverySheetProps {
  /** null = closed. The sheet reads the live delivery so a retry updates it in place. */
  deliveryId: string | null
  onOpenChange: (open: boolean) => void
}

export function DeliverySheet({ deliveryId, onOpenChange }: DeliverySheetProps) {
  const { state, webhooksById, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const delivery = deliveryId ? state.deliveries.find((d) => d.id === deliveryId) : undefined
  const endpoint = delivery ? webhooksById.get(delivery.endpointId) : undefined
  const app = endpoint ? applicationsById.get(endpoint.applicationId) : undefined
  const canRetry = delivery?.status === 'failed' || delivery?.status === 'retrying'

  return (
    <Sheet open={Boolean(delivery)} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {delivery ? (
          <>
            <div className="bg-ink text-on-ink relative overflow-hidden p-6">
              <div className="bg-accent/30 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
              <div className="relative pr-8">
                <Kicker className="text-on-ink-muted">Webhook delivery</Kicker>
                <SheetTitle className="mt-1 font-mono text-lg font-semibold break-all">
                  {delivery.event}
                </SheetTitle>
                <SheetDescription className="text-on-ink-muted mt-1 text-sm">
                  {app?.name ?? 'Unknown application'} · {fmtDateTime(delivery.at)}
                </SheetDescription>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <DeliveryBadge status={delivery.status} />
                  <span className="text-on-ink-muted font-mono text-xs">
                    HTTP {delivery.httpStatus ?? '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <KeyValue
                dense
                rows={[
                  {
                    label: 'Endpoint',
                    value: (
                      <Mono className="break-all">{endpoint?.url ?? delivery.endpointId}</Mono>
                    ),
                  },
                  { label: 'Attempt', value: `${delivery.attempt} of ${delivery.maxAttempts}` },
                  { label: 'Latency', value: fmtMs(delivery.latencyMs) },
                  { label: 'Delivered at', value: fmtDateTime(delivery.at) },
                ]}
              />
              <CodeBlock title="Payload" code={delivery.payload} />
              <CodeBlock
                title="Response"
                code={delivery.response ?? 'No response recorded'}
                tone="light"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {canRetry ? (
                  <Button
                    onClick={() =>
                      dispatch({
                        type: 'webhooks/retry',
                        deliveryId: delivery.id,
                        actor: actorOf(user),
                      })
                    }
                  >
                    <RotateCcw />
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
