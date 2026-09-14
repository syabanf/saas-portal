import { fmtAgo, fmtMs } from '@scp/fixtures'
import type { WebhookDelivery } from '@scp/types'
import { Button, DataTable, cn, type Column, type EmptyStateProps } from '@scp/ui'
import { RotateCcw } from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { DeliveryBadge, Mono } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { DeliverySheet } from './DeliverySheet'

function httpTone(status: number | null): string {
  if (status === null) return 'text-muted'
  if (status < 300) return 'text-success'
  if (status < 500) return 'text-warning'
  return 'text-danger'
}

function attemptLabel(d: WebhookDelivery): string {
  return d.status === 'retrying'
    ? `Retry ${d.attempt}/${d.maxAttempts}`
    : `${d.attempt}/${d.maxAttempts}`
}

export interface DeliveryTableProps {
  rows: WebhookDelivery[]
  /** Hide the application column on the endpoint detail page. */
  showApplication?: boolean
  pageSize?: number
  empty: EmptyStateProps
}

/** Delivery history table plus the detail sheet, shared by the webhooks list and the endpoint page. */
export function DeliveryTable({
  rows,
  showApplication = true,
  pageSize = 10,
  empty,
}: DeliveryTableProps) {
  const { webhooksById, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const now = Date.now()

  const columns: Column<WebhookDelivery>[] = [
    {
      key: 'http',
      header: 'Status',
      cell: (d) => (
        <span
          className={cn('font-mono text-xs font-semibold tabular-nums', httpTone(d.httpStatus))}
        >
          {d.httpStatus ?? '—'}
        </span>
      ),
      sortValue: (d) => d.httpStatus ?? 0,
    },
    {
      key: 'event',
      header: 'Event',
      cell: (d) => <Mono>{d.event}</Mono>,
      sortValue: (d) => d.event,
    },
    ...(showApplication
      ? [
          {
            key: 'app',
            header: 'Application',
            cell: (d: WebhookDelivery) => {
              const endpoint = webhooksById.get(d.endpointId)
              return (
                <span className="text-sm">
                  {endpoint
                    ? (applicationsById.get(endpoint.applicationId)?.name ?? endpoint.applicationId)
                    : d.endpointId}
                </span>
              )
            },
          },
        ]
      : []),
    {
      key: 'latency',
      header: 'Latency',
      cell: (d) => <span className="tabular-nums">{fmtMs(d.latencyMs)}</span>,
      sortValue: (d) => d.latencyMs ?? 0,
      align: 'right',
    },
    {
      key: 'attempt',
      header: 'Attempt',
      cell: (d) => (
        <span className={cn('text-xs', d.status === 'retrying' && 'text-warning font-semibold')}>
          {attemptLabel(d)}
        </span>
      ),
    },
    {
      key: 'at',
      header: 'At',
      cell: (d) => <span className="text-muted text-xs">{fmtAgo(d.at, now)}</span>,
      sortValue: (d) => d.at,
    },
    { key: 'state', header: 'Delivery', cell: (d) => <DeliveryBadge status={d.status} /> },
  ]

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(d) => d.id}
        pageSize={pageSize}
        onRowClick={(d) => setSelectedId(d.id)}
        empty={empty}
        rowActions={(d) =>
          d.status === 'failed' || d.status === 'retrying' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({ type: 'webhooks/retry', deliveryId: d.id, actor: actorOf(user) })
              }
            >
              <RotateCcw />
              Retry
            </Button>
          ) : null
        }
      />
      <DeliverySheet
        deliveryId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </>
  )
}
