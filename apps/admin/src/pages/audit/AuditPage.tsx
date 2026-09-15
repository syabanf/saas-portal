import { avatarColor, fmtDateTime, fmtNumber, initials } from '@scp/fixtures'
import type { AuditAction, AuditLog } from '@scp/types'
import { AUDIT_ACTION_LABEL } from '@scp/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CodeBlock,
  Combobox,
  DataTable,
  Input,
  KeyValue,
  Kicker,
  PageHeader,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  StatCard,
  cn,
  type BadgeTone,
  type Column,
} from '@scp/ui'
import { Building2, Download, ScrollText, Search, ShieldX, Users } from 'lucide-react'
import * as React from 'react'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { Mono } from '../../components/badges'
import { PILL_COMBOBOX, PILL_INPUT, useFilterParams } from '../../lib/filters'
import { labelOptions, tenantOptions, withAll } from '../../lib/options'
import { useScoped } from '../../state/app-state'
import { downloadJson } from './downloadJson'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const ACTION_FILTERS = withAll(
  'All actions',
  labelOptions(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[], AUDIT_ACTION_LABEL),
)
const SINCE_MS: Record<string, number> = {
  '1h': HOUR,
  '24h': DAY,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
}
const SINCE_FILTERS = withAll('All time', [
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
])
const FILTER_KEYS = ['action', 'org', 'actor', 'since', 'q'] as const

function actionTone(action: AuditAction): BadgeTone {
  if (/\.(denied|suspended|revoked)$/.test(action)) return 'danger'
  if (/\.(allowed|reactivated|created)$/.test(action)) return 'success'
  return 'default'
}

function pretty(value: Record<string, unknown> | null): string {
  return value === null ? 'null' : JSON.stringify(value, null, 2)
}

export function AuditPage() {
  const { state, tenants, tenantsById } = useScoped()
  const now = Date.now()
  const filters = useFilterParams(FILTER_KEYS)
  const { action, org, actor, since, q: query } = filters.values
  const [selected, setSelected] = React.useState<AuditLog | null>(null)

  const stats = React.useMemo(() => {
    const actors = new Set<string>()
    const organizations = new Set<string>()
    let today = 0
    let denied = 0
    for (const a of state.auditLogs) {
      actors.add(a.actorId)
      if (a.tenantId) organizations.add(a.tenantId)
      if (now - new Date(a.at).getTime() <= DAY) today += 1
      if (a.action === 'access.denied') denied += 1
    }
    return { today, denied, actors: actors.size, organizations: organizations.size }
  }, [state.auditLogs, now])

  const actorFilters = React.useMemo(() => {
    const names = new Map<string, string>()
    for (const a of state.auditLogs) names.set(a.actorId, a.actorName)
    return withAll(
      'All actors',
      [...names.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label, hint: value })),
    )
  }, [state.auditLogs])

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const sinceAt = SINCE_MS[since] ? now - SINCE_MS[since] : 0
    return state.auditLogs.filter((a) => {
      if (action && a.action !== action) return false
      if (org && a.tenantId !== org) return false
      if (actor && a.actorId !== actor) return false
      if (sinceAt && new Date(a.at).getTime() < sinceAt) return false
      if (!needle) return true
      return [a.actorName, a.resourceId, a.requestId ?? ''].some((v) =>
        v.toLowerCase().includes(needle),
      )
    })
  }, [state.auditLogs, action, org, actor, since, query, now])

  const columns: Column<AuditLog>[] = [
    {
      key: 'at',
      header: 'Time',
      cell: (a) => (
        <span className="text-muted text-xs whitespace-nowrap">{fmtDateTime(a.at)}</span>
      ),
      sortValue: (a) => a.at,
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: (a) => (
        <div className="flex items-center gap-2">
          <Avatar initials={initials(a.actorName)} color={avatarColor(a.actorId)} size="sm" />
          <span className="truncate text-sm font-medium">{a.actorName}</span>
        </div>
      ),
      sortValue: (a) => a.actorName,
    },
    {
      key: 'action',
      header: 'Action',
      cell: (a) => <Badge variant={actionTone(a.action)}>{AUDIT_ACTION_LABEL[a.action]}</Badge>,
      sortValue: (a) => a.action,
    },
    {
      key: 'resource',
      header: 'Resource',
      cell: (a) => (
        <div className="min-w-0">
          <p className="text-muted text-xs">{a.resourceType}</p>
          <Mono>{a.resourceId}</Mono>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Organization',
      cell: (a) => (
        <span className="text-sm">
          {a.tenantId ? (
            (tenantsById.get(a.tenantId)?.name ?? a.tenantId)
          ) : (
            <span className="text-muted">Platform</span>
          )}
        </span>
      ),
    },
    {
      key: 'request',
      header: 'Request',
      cell: (a) =>
        a.requestId ? <Mono>{a.requestId}</Mono> : <span className="text-muted">—</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Who changed what, when, with the before and after state."
        actions={
          <Button
            variant="ghost"
            onClick={() =>
              downloadJson(`audit-${new Date().toISOString().slice(0, 10)}.json`, rows)
            }
            disabled={rows.length === 0}
          >
            <Download />
            Export {rows.length} entries
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Entries today"
          value={fmtNumber(stats.today)}
          hint="Last 24 hours"
          icon={<ScrollText />}
          tone="ink"
        />
        <StatCard
          label="Denied access"
          value={fmtNumber(stats.denied)}
          hint="Access denied entries"
          icon={<ShieldX />}
          tone="danger"
        />
        <StatCard
          label="Distinct actors"
          value={fmtNumber(stats.actors)}
          hint="People and services"
          icon={<Users />}
          tone="info"
        />
        <StatCard
          label="Organizations touched"
          value={fmtNumber(stats.organizations)}
          hint="Platform entries excluded"
          icon={<Building2 />}
          tone="default"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          leftIcon={<Search />}
          placeholder="Actor, resource id, request id"
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          className={cn('w-full sm:w-72', PILL_INPUT)}
        />
        <Combobox
          value={action || 'all'}
          onChange={(v) => filters.set('action', v)}
          options={ACTION_FILTERS}
          searchPlaceholder="Search actions…"
          className={cn('w-full sm:w-56', PILL_COMBOBOX)}
        />
        <Combobox
          value={org || 'all'}
          onChange={(v) => filters.set('org', v)}
          options={withAll('All organizations', tenantOptions(tenants))}
          searchPlaceholder="Search organizations…"
          className={cn('w-full sm:w-52', PILL_COMBOBOX)}
        />
        <Combobox
          value={actor || 'all'}
          onChange={(v) => filters.set('actor', v)}
          options={actorFilters}
          searchPlaceholder="Search actors…"
          className={cn('w-full sm:w-48', PILL_COMBOBOX)}
        />
        <Combobox
          value={since || 'all'}
          onChange={(v) => filters.set('since', v)}
          options={SINCE_FILTERS}
          searchPlaceholder="Search…"
          className={cn('w-full sm:w-44', PILL_COMBOBOX)}
        />
        {filters.active ? <ClearFiltersButton onClick={filters.clear} /> : null}
      </div>

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          pageSize={20}
          onRowClick={setSelected}
          empty={
            filters.active
              ? {
                  icon: <ScrollText />,
                  title: 'No matches',
                  description:
                    'Every change in the console lands here. Loosen the filters to see more.',
                  action: <ClearFiltersButton onClick={filters.clear} />,
                }
              : {
                  icon: <ScrollText />,
                  title: 'No audit entries yet',
                  description: 'Every change in the console lands here.',
                }
          }
        />
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="p-0">
          {selected ? (
            <>
              <div className="bg-ink text-on-ink relative overflow-hidden p-6">
                <div className="bg-accent/30 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
                <div className="relative pr-8">
                  <Kicker className="text-on-ink-muted">Audit entry</Kicker>
                  <SheetTitle className="mt-1 text-2xl font-bold tracking-tight">
                    {AUDIT_ACTION_LABEL[selected.action]}
                  </SheetTitle>
                  <SheetDescription className="text-on-ink-muted mt-1 text-sm">
                    {selected.actorName} · {fmtDateTime(selected.at)}
                  </SheetDescription>
                  <div className="mt-4">
                    <Badge className="border border-white/10 bg-white/10 text-white">
                      {selected.action}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <KeyValue
                  dense
                  rows={[
                    { label: 'Who', value: `${selected.actorName} (${selected.actorId})` },
                    { label: 'What', value: AUDIT_ACTION_LABEL[selected.action] },
                    { label: 'When', value: fmtDateTime(selected.at) },
                    {
                      label: 'Tenant',
                      value: selected.tenantId
                        ? (tenantsById.get(selected.tenantId)?.name ?? selected.tenantId)
                        : 'Platform',
                    },
                    {
                      label: 'Resource',
                      value: (
                        <span>
                          {selected.resourceType} <Mono>{selected.resourceId}</Mono>
                        </span>
                      ),
                    },
                    {
                      label: 'Request id',
                      value: selected.requestId ? <Mono>{selected.requestId}</Mono> : 'None',
                    },
                    {
                      label: 'Source IP',
                      value: selected.sourceIp ? <Mono>{selected.sourceIp}</Mono> : 'Not recorded',
                    },
                  ]}
                />
                <CodeBlock title="Before" code={pretty(selected.before)} tone="light" />
                <CodeBlock title="After" code={pretty(selected.after)} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
