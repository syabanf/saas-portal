import { fmtNumber } from '@scp/fixtures'
import type { DeliveryStatus, WebhookEndpoint } from '@scp/types'
import { DELIVERY_STATUS_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconTile,
  PageHeader,
  Select,
  StatCard,
  Toggle,
} from '@scp/ui'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Trash2,
  Webhook,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { AppTypeIcon, Mono } from '../../components/badges'
import { WebhookDialog, emptyWebhook } from '../../components/master/WebhookDialog'
import { actorOf, useScoped } from '../../state/app-state'
import { DeliveryTable } from './DeliveryTable'

const DAY = 86_400_000
const STATUSES = Object.keys(DELIVERY_STATUS_LABEL) as DeliveryStatus[]

export function WebhooksPage() {
  const { state, webhooks, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const now = Date.now()

  const [editing, setEditing] = React.useState<WebhookEndpoint | null>(null)
  const [deleting, setDeleting] = React.useState<WebhookEndpoint | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<'all' | DeliveryStatus>('all')
  const [endpointFilter, setEndpointFilter] = React.useState('all')

  const stats = React.useMemo(() => {
    const recent = state.deliveries.filter((d) => now - new Date(d.at).getTime() <= DAY)
    const failing = state.deliveries.filter(
      (d) => d.status === 'failed' || d.status === 'retrying',
    ).length
    const success = state.deliveries.filter((d) => d.status === 'success').length
    const rate =
      state.deliveries.length === 0 ? 100 : Math.round((success / state.deliveries.length) * 100)
    return { recent: recent.length, failing, rate }
  }, [state.deliveries, now])

  const deliveries = React.useMemo(
    () =>
      state.deliveries.filter(
        (d) =>
          (statusFilter === 'all' || d.status === statusFilter) &&
          (endpointFilter === 'all' || d.endpointId === endpointFilter),
      ),
    [state.deliveries, statusFilter, endpointFilter],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Webhooks"
        description="Signed, timestamped deliveries with retries and a full delivery log per endpoint."
        actions={
          <Button onClick={() => setEditing(emptyWebhook())}>
            <Plus />
            Add endpoint
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Endpoints"
          value={fmtNumber(webhooks.length)}
          hint={`${webhooks.filter((w) => w.status === 'active').length} active`}
          icon={<Webhook />}
          tone="ink"
        />
        <StatCard
          label="Deliveries"
          value={fmtNumber(stats.recent)}
          hint="Last 24 hours"
          icon={<Activity />}
        />
        <StatCard
          label="Failed or retrying"
          value={fmtNumber(stats.failing)}
          icon={<AlertTriangle />}
          tone="danger"
        />
        <StatCard
          label="Success rate"
          value={`${stats.rate}%`}
          hint="All deliveries"
          icon={<CheckCircle2 />}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            Open an endpoint to see its signing details and delivery history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {webhooks.length === 0 ? (
            <EmptyState
              icon={<Webhook />}
              title="No endpoints yet"
              description="Add an endpoint so an application receives subscription and payment events."
              action={
                <Button size="sm" onClick={() => setEditing(emptyWebhook())}>
                  Add endpoint
                </Button>
              }
            />
          ) : (
            webhooks.map((w) => {
              const app = applicationsById.get(w.applicationId)
              return (
                <div
                  key={w.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/webhooks/${w.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/webhooks/${w.id}`)}
                  className="bg-surface-2 hover:bg-card hover:shadow-card flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl p-3 transition-colors"
                >
                  <IconTile size="sm" tone="ink">
                    {app ? <AppTypeIcon type={app.type} /> : <Webhook />}
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-sm font-bold">{w.url}</code>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-muted text-xs">
                        {app?.name ?? 'Unknown application'}
                      </span>
                      <Badge variant="muted">{w.events.length} events</Badge>
                      {w.events.slice(0, 3).map((ev) => (
                        <span key={ev} className="bg-card rounded-full px-2 py-0.5">
                          <Mono className="text-[11px]">{ev}</Mono>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Toggle
                      checked={w.status === 'active'}
                      label="Endpoint active"
                      onCheckedChange={(on) =>
                        dispatch({
                          type: 'webhooks/upsert',
                          endpoint: { ...w, status: on ? 'active' : 'paused' },
                          actor: actorOf(user),
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        dispatch({ type: 'webhooks/test', endpointId: w.id, actor: actorOf(user) })
                      }
                    >
                      <Send />
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(w)}>
                      <Pencil />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="More actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem danger onSelect={() => setDeleting(w)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Delivery history</CardTitle>
            <CardDescription>Click a row for the payload and response.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              tone="ghost"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | DeliveryStatus)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DELIVERY_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Select
              tone="ghost"
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              aria-label="Filter by endpoint"
            >
              <option value="all">All endpoints</option>
              {webhooks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.url}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <DeliveryTable
          rows={deliveries}
          empty={{
            title: 'No deliveries match',
            description: 'Change the filters or send a test delivery from an endpoint.',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setEndpointFilter('all')
                }}
              >
                Clear filters
              </Button>
            ),
          }}
        />
      </Card>

      <WebhookDialog endpoint={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete endpoint?"
        description={`${deleting?.url ?? 'This endpoint'} stops receiving events and its delivery history is removed.`}
        onConfirm={() => {
          if (deleting) dispatch({ type: 'webhooks/remove', id: deleting.id })
          setDeleting(null)
        }}
      />
    </div>
  )
}
