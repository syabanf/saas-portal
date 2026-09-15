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
  Combobox,
  ConfirmDelete,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconTile,
  PageHeader,
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
import { DAY, useUrlFilters } from '../../lib/filters'
import { allOption, labelOptions } from '../../lib/options'
import { DeliveryTable } from './DeliveryTable'

const STATUSES = Object.keys(DELIVERY_STATUS_LABEL) as DeliveryStatus[]
const FILTER_KEYS = ['status', 'endpoint', 'event', 'http'] as const
const HTTP_OPTIONS = [
  allOption('All HTTP statuses'),
  { value: '2xx', label: '2xx delivered' },
  { value: '4xx', label: '4xx rejected' },
  { value: '5xx', label: '5xx failed' },
]

function httpClass(status: number | null): string {
  return status === null ? '' : `${Math.floor(status / 100)}xx`
}

export function WebhooksPage() {
  const { state, webhooks, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const now = Date.now()

  const [editing, setEditing] = React.useState<WebhookEndpoint | null>(null)
  const [deleting, setDeleting] = React.useState<WebhookEndpoint | null>(null)
  const filters = useUrlFilters(FILTER_KEYS)
  const statusFilter = filters.get('status')
  const endpointFilter = filters.get('endpoint')
  const eventFilter = filters.get('event')
  const httpFilter = filters.get('http')

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

  const eventOptions = React.useMemo(
    () =>
      Array.from(new Set(state.deliveries.map((d) => d.event)))
        .sort()
        .map((e) => ({ value: e, label: e })),
    [state.deliveries],
  )

  const deliveries = React.useMemo(
    () =>
      state.deliveries.filter(
        (d) =>
          (statusFilter === 'all' || d.status === statusFilter) &&
          (endpointFilter === 'all' || d.endpointId === endpointFilter) &&
          (eventFilter === 'all' || d.event === eventFilter) &&
          (httpFilter === 'all' || httpClass(d.httpStatus) === httpFilter),
      ),
    [state.deliveries, statusFilter, endpointFilter, eventFilter, httpFilter],
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
          hint="All deliveries"
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
          <div className="flex flex-wrap items-center gap-2">
            <Combobox
              tone="ghost"
              value={statusFilter}
              onChange={(v) => filters.set('status', v)}
              options={[
                allOption('All statuses'),
                ...labelOptions(STATUSES, DELIVERY_STATUS_LABEL),
              ]}
            />
            <Combobox
              tone="ghost"
              value={endpointFilter}
              onChange={(v) => filters.set('endpoint', v)}
              options={[
                allOption('All endpoints'),
                ...webhooks.map((w) => ({
                  value: w.id,
                  label: w.url,
                  hint: applicationsById.get(w.applicationId)?.name,
                })),
              ]}
              searchPlaceholder="Search endpoints"
            />
            <Combobox
              tone="ghost"
              value={eventFilter}
              onChange={(v) => filters.set('event', v)}
              options={[allOption('All events'), ...eventOptions]}
              searchPlaceholder="Search events"
            />
            <Combobox
              tone="ghost"
              value={httpFilter}
              onChange={(v) => filters.set('http', v)}
              options={HTTP_OPTIONS}
            />
            {filters.active ? (
              <Button variant="ghost" size="sm" onClick={filters.clear}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <DeliveryTable
          rows={deliveries}
          empty={{
            title: state.deliveries.length === 0 ? 'No deliveries yet' : 'No matches',
            description:
              state.deliveries.length === 0
                ? 'Send a test delivery from an endpoint to see it here.'
                : 'Change the filters or send a test delivery from an endpoint.',
            action: filters.active ? (
              <Button variant="outline" size="sm" onClick={filters.clear}>
                Clear filters
              </Button>
            ) : undefined,
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
