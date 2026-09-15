import { fmtDateTime, fmtMs, fmtNumber } from '@scp/fixtures'
import type { AccessLog } from '@scp/types'
import { ACCESS_REASON_LABEL } from '@scp/types'
import {
  Button,
  Card,
  Combobox,
  DataTable,
  Input,
  PageHeader,
  StatCard,
  type Column,
} from '@scp/ui'
import { Activity, Gauge, Search, ShieldCheck, ShieldX } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { DecisionBadge, Mono } from '../../components/badges'
import { useScoped } from '../../state/app-state'
import {
  DAY,
  PILL_COMBOBOX,
  PILL_INPUT,
  useUrlFilters,
  windowDays,
  withinLastDays,
  type WindowOption,
} from '../../lib/filters'
import { allOption, applicationOptions, tenantOptions, userOptions } from '../../lib/options'
import { AccessLogSheet } from './AccessLogSheet'

const FILTER_KEYS = ['decision', 'app', 'tenant', 'reason', 'user', 'since', 'q'] as const
const DECISION_OPTIONS = [
  allOption('All decisions'),
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
]
const SINCE_WINDOWS: WindowOption[] = [
  { value: 'all', label: 'All time', days: null },
  { value: 'hour', label: 'Last hour', days: 1 / 24 },
  { value: '1', label: 'Last 24 hours', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
]

export function LogsPage() {
  const { state, applications, tenants, users, usersById, tenantsById, applicationsById } =
    useScoped()
  const now = Date.now()

  const filters = useUrlFilters(FILTER_KEYS)
  const decision = filters.get('decision')
  const appFilter = filters.get('app')
  const tenantFilter = filters.get('tenant')
  const reasonFilter = filters.get('reason')
  const userFilter = filters.get('user')
  const sinceDays = windowDays(SINCE_WINDOWS, filters.get('since'))
  const query = filters.get('q', '')
  const [selected, setSelected] = React.useState<AccessLog | null>(null)

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

  const reasonOptions = React.useMemo(
    () =>
      Array.from(new Set(state.accessLogs.map((l) => l.reason))).map((r) => ({
        value: r,
        label: ACCESS_REASON_LABEL[r],
        hint: r,
      })),
    [state.accessLogs],
  )
  const seenUsers = React.useMemo(() => {
    const ids = new Set(state.accessLogs.map((l) => l.userId))
    return users.filter((u) => ids.has(u.id))
  }, [state.accessLogs, users])

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.accessLogs.filter((l) => {
      if (decision !== 'all' && l.decision !== decision) return false
      if (appFilter !== 'all' && l.applicationId !== appFilter) return false
      if (tenantFilter !== 'all' && l.tenantId !== tenantFilter) return false
      if (reasonFilter !== 'all' && l.reason !== reasonFilter) return false
      if (userFilter !== 'all' && l.userId !== userFilter) return false
      if (!withinLastDays(l.at, sinceDays, now)) return false
      if (!q) return true
      const u = usersById.get(l.userId)
      return (
        l.requestId.toLowerCase().includes(q) ||
        Boolean(u?.name.toLowerCase().includes(q)) ||
        Boolean(u?.email.toLowerCase().includes(q))
      )
    })
  }, [
    state.accessLogs,
    decision,
    appFilter,
    tenantFilter,
    reasonFilter,
    userFilter,
    sinceDays,
    now,
    query,
    usersById,
  ])

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
        <Input
          leftIcon={<Search />}
          placeholder="User or request id"
          aria-label="Search access logs"
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          className={`w-full sm:w-56 ${PILL_INPUT}`}
        />
        <Combobox
          value={decision}
          onChange={(v) => filters.set('decision', v)}
          options={DECISION_OPTIONS}
          className={`w-full sm:w-40 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={appFilter}
          onChange={(v) => filters.set('app', v)}
          options={[allOption('All applications'), ...applicationOptions(applications)]}
          searchPlaceholder="Search applications"
          className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={tenantFilter}
          onChange={(v) => filters.set('tenant', v)}
          options={[allOption('All organizations'), ...tenantOptions(tenants)]}
          searchPlaceholder="Search organizations"
          className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={userFilter}
          onChange={(v) => filters.set('user', v)}
          options={[allOption('All users'), ...userOptions(seenUsers)]}
          searchPlaceholder="Search name or email"
          className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={reasonFilter}
          onChange={(v) => filters.set('reason', v)}
          options={[allOption('All reasons'), ...reasonOptions]}
          searchPlaceholder="Search reasons"
          className={`w-full sm:w-56 ${PILL_COMBOBOX}`}
        />
        <Combobox
          value={filters.get('since')}
          onChange={(v) => filters.set('since', v)}
          options={SINCE_WINDOWS}
          className={`w-full sm:w-40 ${PILL_COMBOBOX}`}
        />
        {filters.active ? (
          <Button variant="ghost" size="sm" onClick={filters.clear}>
            Clear filters
          </Button>
        ) : null}
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
            title: state.accessLogs.length === 0 ? 'No decisions yet' : 'No matches',
            description:
              state.accessLogs.length === 0
                ? 'An entry lands here every time an application asks the access broker to admit a user.'
                : 'Loosen the filters to see decisions from other applications or time windows.',
            action: filters.active ? (
              <Button variant="outline" size="sm" onClick={filters.clear}>
                Clear filters
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/access-policies">Open access policies</Link>
              </Button>
            ),
          }}
        />
      </Card>

      <AccessLogSheet log={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
