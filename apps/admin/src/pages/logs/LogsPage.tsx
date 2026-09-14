import { fmtDateTime, fmtMs, fmtNumber } from '@scp/fixtures'
import type { AccessDecision, AccessLog, AccessReason } from '@scp/types'
import { ACCESS_REASON_LABEL } from '@scp/types'
import { Button, Card, DataTable, Input, PageHeader, Select, StatCard, type Column } from '@scp/ui'
import { Activity, Gauge, Search, ShieldCheck, ShieldX } from 'lucide-react'
import * as React from 'react'
import { useSearchParams } from 'react-router'
import { DecisionBadge, Mono } from '../../components/badges'
import { useScoped } from '../../state/app-state'
import { AccessLogSheet } from './AccessLogSheet'

const DAY = 86_400_000
type DecisionFilter = 'all' | AccessDecision

export function LogsPage() {
  const { state, applications, tenants, usersById, tenantsById, applicationsById } = useScoped()
  const [params, setParams] = useSearchParams()
  const now = Date.now()

  const [decision, setDecision] = React.useState<DecisionFilter>('all')
  const appFilter = params.get('app') ?? 'all'
  const [tenantFilter, setTenantFilter] = React.useState('all')
  const [reasonFilter, setReasonFilter] = React.useState<'all' | AccessReason>('all')
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<AccessLog | null>(null)

  function setAppFilter(id: string) {
    const p = new URLSearchParams(params)
    if (id === 'all') p.delete('app')
    else p.set('app', id)
    setParams(p, { replace: true })
  }

  const stats = React.useMemo(() => {
    const recent = state.accessLogs.filter((l) => now - new Date(l.at).getTime() <= DAY)
    const sample = recent.length > 0 ? recent : state.accessLogs
    const allowed = recent.filter((l) => l.decision === 'allow').length
    const avg =
      sample.length === 0
        ? 0
        : Math.round(sample.reduce((sum, l) => sum + l.latencyMs, 0) / sample.length)
    return { total: recent.length, allowed, denied: recent.length - allowed, avg }
  }, [state.accessLogs, now])

  const reasons = React.useMemo(
    () => Array.from(new Set(state.accessLogs.map((l) => l.reason))),
    [state.accessLogs],
  )

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.accessLogs.filter((l) => {
      if (decision !== 'all' && l.decision !== decision) return false
      if (appFilter !== 'all' && l.applicationId !== appFilter) return false
      if (tenantFilter !== 'all' && l.tenantId !== tenantFilter) return false
      if (reasonFilter !== 'all' && l.reason !== reasonFilter) return false
      if (!q) return true
      const u = usersById.get(l.userId)
      return (
        l.requestId.toLowerCase().includes(q) ||
        Boolean(u?.name.toLowerCase().includes(q)) ||
        Boolean(u?.email.toLowerCase().includes(q))
      )
    })
  }, [state.accessLogs, decision, appFilter, tenantFilter, reasonFilter, query, usersById])

  function clearFilters() {
    setDecision('all')
    setAppFilter('all')
    setTenantFilter('all')
    setReasonFilter('all')
    setQuery('')
  }

  const columns: Column<AccessLog>[] = [
    {
      key: 'at',
      header: 'Time',
      cell: (l) => (
        <span className="text-muted text-xs whitespace-nowrap">{fmtDateTime(l.at)}</span>
      ),
      sortValue: (l) => l.at,
    },
    { key: 'request', header: 'Request', cell: (l) => <Mono>{l.requestId}</Mono> },
    {
      key: 'user',
      header: 'User',
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {usersById.get(l.userId)?.name ?? l.userId}
          </p>
          <p className="text-muted truncate text-xs">
            {tenantsById.get(l.tenantId)?.name ?? l.tenantId}
          </p>
        </div>
      ),
      sortValue: (l) => usersById.get(l.userId)?.name ?? '',
    },
    {
      key: 'app',
      header: 'Application',
      cell: (l) => (
        <span className="text-sm">
          {applicationsById.get(l.applicationId)?.name ?? l.applicationId}
        </span>
      ),
      sortValue: (l) => applicationsById.get(l.applicationId)?.name ?? '',
    },
    {
      key: 'decision',
      header: 'Decision',
      cell: (l) => <DecisionBadge decision={l.decision} />,
      sortValue: (l) => l.decision,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{ACCESS_REASON_LABEL[l.reason]}</p>
          {l.warning ? (
            <p className="text-muted truncate text-xs">{ACCESS_REASON_LABEL[l.warning]}</p>
          ) : null}
        </div>
      ),
      sortValue: (l) => l.reason,
    },
    {
      key: 'latency',
      header: 'Latency',
      cell: (l) => <span className="tabular-nums">{fmtMs(l.latencyMs)}</span>,
      sortValue: (l) => l.latencyMs,
      align: 'right',
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Access logs"
        description="Every access broker decision with its standard reason code and latency."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Requests"
          value={fmtNumber(stats.total)}
          hint="Last 24 hours"
          icon={<Activity />}
          tone="ink"
        />
        <StatCard
          label="Allowed"
          value={fmtNumber(stats.allowed)}
          icon={<ShieldCheck />}
          tone="success"
        />
        <StatCard label="Denied" value={fmtNumber(stats.denied)} icon={<ShieldX />} tone="danger" />
        <StatCard label="Avg latency" value={fmtMs(stats.avg)} icon={<Gauge />} tone="info" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={decision}
          onChange={(e) => setDecision(e.target.value as DecisionFilter)}
          aria-label="Decision"
          className="w-full sm:w-40"
        >
          <option value="all">All decisions</option>
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
        </Select>
        <Select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          aria-label="Application"
          className="w-full sm:w-52"
        >
          <option value="all">All applications</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          aria-label="Organization"
          className="w-full sm:w-52"
        >
          <option value="all">All organizations</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as 'all' | AccessReason)}
          aria-label="Reason"
          className="w-full sm:w-56"
        >
          <option value="all">All reasons</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {ACCESS_REASON_LABEL[r]}
            </option>
          ))}
        </Select>
        <Input
          leftIcon={<Search />}
          placeholder="User or request id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(l) => l.id}
          pageSize={15}
          onRowClick={setSelected}
          empty={{
            icon: <Activity />,
            title: 'No decisions match',
            description: 'Loosen the filters or run an exchange from the access simulator.',
            action: (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ),
          }}
        />
      </Card>

      <AccessLogSheet log={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
