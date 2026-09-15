import { fmtAgo, fmtNumber } from '@scp/fixtures'
import type { Application, ApplicationType, IntegrationHealth, WebhookDelivery } from '@scp/types'
import { APPLICATION_TYPE_LABEL, HEALTH_LABEL } from '@scp/types'
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  EmptyState,
  IconTile,
  Input,
  KeyValue,
  PageHeader,
  StatCard,
} from '@scp/ui'
import {
  Activity,
  AlertTriangle,
  AppWindow,
  CheckCircle2,
  RotateCcw,
  Search,
  WifiOff,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { AppTypeIcon, HealthDot, Mono } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { PILL_COMBOBOX, PILL_INPUT, useUrlFilters } from '../../lib/filters'
import { allOption, labelOptions } from '../../lib/options'

const FILTER_KEYS = ['health', 'type', 'q'] as const
const HEALTHS: IntegrationHealth[] = ['healthy', 'degraded', 'offline']
const TYPES = Object.keys(APPLICATION_TYPE_LABEL) as ApplicationType[]

interface AppHealth {
  app: Application
  endpointCount: number
  failed: WebhookDelivery[]
}

export function HealthPage() {
  const { applications, webhooksByApplication, deliveriesByEndpoint, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const now = Date.now()
  const filters = useUrlFilters(FILTER_KEYS)
  const health = filters.get('health')
  const type = filters.get('type')
  const query = filters.get('q', '')

  const rows = React.useMemo<AppHealth[]>(
    () =>
      applications.map((app) => {
        const endpoints = webhooksByApplication.get(app.id) ?? []
        const failed = endpoints
          .flatMap((e) => deliveriesByEndpoint.get(e.id) ?? [])
          .filter((d) => d.status === 'failed' || d.status === 'retrying')
          .sort((a, b) => b.at.localeCompare(a.at))
        return { app, endpointCount: endpoints.length, failed }
      }),
    [applications, webhooksByApplication, deliveriesByEndpoint],
  )

  const healthy = rows.filter((r) => r.app.health === 'healthy').length
  const failedTotal = rows.reduce((sum, r) => sum + r.failed.length, 0)
  const incidents = rows.filter((r) => r.app.health !== 'healthy')
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (health === 'all' || r.app.health === health) &&
        (type === 'all' || r.app.type === type) &&
        (!q || r.app.name.toLowerCase().includes(q) || r.app.code.toLowerCase().includes(q)),
    )
  }, [rows, health, type, query])

  function retry(row: AppHealth) {
    const newest = row.failed[0]
    if (newest) {
      dispatch({ type: 'webhooks/retry', deliveryId: newest.id, actor: actorOf(user) })
      return
    }
    dispatch({
      type: 'applications/upsert',
      application: {
        ...row.app,
        health: 'healthy',
        lastFailure: null,
        lastSuccessAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      actor: actorOf(user),
    })
  }

  function viewLogs(row: AppHealth) {
    const endpoint = webhooksByApplication.get(row.app.id)?.[0]
    navigate(endpoint ? `/webhooks/${endpoint.id}` : `/logs?app=${row.app.id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integration health"
        description="Token exchanges and webhook deliveries per application, with the latest failure and a retry."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={fmtNumber(rows.length)}
          icon={<AppWindow />}
          tone="ink"
        />
        <StatCard
          label="Healthy"
          value={fmtNumber(healthy)}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="Issues"
          value={fmtNumber(rows.length - healthy)}
          icon={<WifiOff />}
          tone="danger"
        />
        <StatCard
          label="Deliveries failed"
          value={fmtNumber(failedTotal)}
          hint="Failed or retrying"
          icon={<AlertTriangle />}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          leftIcon={<Search />}
          placeholder="Search name or code"
          aria-label="Search applications"
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          className={`w-full sm:w-64 ${PILL_INPUT}`}
        />
        <Combobox
          value={health}
          onChange={(v) => filters.set('health', v)}
          options={[allOption('All health states'), ...labelOptions(HEALTHS, HEALTH_LABEL)]}
          className={`w-full sm:w-48 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={type}
          onChange={(v) => filters.set('type', v)}
          options={[allOption('All types'), ...labelOptions(TYPES, APPLICATION_TYPE_LABEL)]}
          className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
        />
        {filters.active ? (
          <Button variant="ghost" size="sm" onClick={filters.clear}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AppWindow />}
            title="No applications registered"
            description="Health appears once an application is connected."
            action={
              <Button onClick={() => navigate('/applications/new')}>Create application</Button>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AppWindow />}
            title="No matches"
            description="Try another health state, type or search."
            action={
              <Button variant="outline" size="sm" onClick={filters.clear}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => (
            <Card key={row.app.id} className="flex flex-col">
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <IconTile
                  tone={
                    row.app.health === 'healthy'
                      ? 'default'
                      : row.app.health === 'degraded'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  <AppTypeIcon type={row.app.type} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{row.app.name}</CardTitle>
                  <Mono className="text-muted">{row.app.code}</Mono>
                </div>
                <HealthDot health={row.app.health} />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <KeyValue
                  dense
                  rows={[
                    { label: 'Last success', value: fmtAgo(row.app.lastSuccessAt, now) },
                    { label: 'Last failure', value: row.app.lastFailure ?? 'None' },
                    { label: 'Endpoints', value: fmtNumber(row.endpointCount) },
                    {
                      label: 'Failed',
                      value: (
                        <span
                          className={
                            row.failed.length > 0 ? 'text-danger font-semibold' : undefined
                          }
                        >
                          {fmtNumber(row.failed.length)}
                        </span>
                      ),
                    },
                  ]}
                />
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    variant={row.app.health === 'healthy' ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => retry(row)}
                  >
                    <RotateCcw />
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => viewLogs(row)}>
                    <Activity />
                    View logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>Applications that are not reporting healthy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {incidents.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 />}
              title="All integrations healthy"
              description="Nothing needs attention right now."
              action={
                <Button variant="outline" size="sm" onClick={() => navigate('/webhooks')}>
                  Open webhooks
                </Button>
              }
            />
          ) : (
            incidents.map((row) => (
              <Banner
                key={row.app.id}
                tone={row.app.health === 'offline' ? 'danger' : 'warning'}
                icon={row.app.health === 'offline' ? <WifiOff /> : <AlertTriangle />}
                title={`${row.app.name} · ${HEALTH_LABEL[row.app.health]}.`}
                description={`${row.app.lastFailure ?? 'No failure detail'} · last success ${fmtAgo(row.app.lastSuccessAt, now)}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => retry(row)}>
                    Retry
                  </Button>
                }
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
