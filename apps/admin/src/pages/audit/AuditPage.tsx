import { avatarColor, fmtDateTime, initials } from '@scp/fixtures'
import type { AuditAction, AuditLog } from '@scp/types'
import { AUDIT_ACTION_LABEL } from '@scp/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CodeBlock,
  DataTable,
  Input,
  KeyValue,
  Kicker,
  PageHeader,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  type BadgeTone,
  type Column,
} from '@scp/ui'
import { Download, ScrollText, Search } from 'lucide-react'
import * as React from 'react'
import { Mono } from '../../components/badges'
import { useScoped } from '../../state/app-state'
import { downloadJson } from './downloadJson'

const ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]

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
  const [action, setAction] = React.useState<'all' | AuditAction>('all')
  const [tenantFilter, setTenantFilter] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<AuditLog | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.auditLogs.filter((a) => {
      if (action !== 'all' && a.action !== action) return false
      if (tenantFilter !== 'all' && a.tenantId !== tenantFilter) return false
      if (!q) return true
      return [a.actorName, a.resourceId, a.requestId ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [state.auditLogs, action, tenantFilter, query])

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

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={action}
          onChange={(e) => setAction(e.target.value as 'all' | AuditAction)}
          aria-label="Action"
          className="w-full sm:w-56"
        >
          <option value="all">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_LABEL[a]}
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
        <Input
          leftIcon={<Search />}
          placeholder="Actor, resource id, request id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
      </div>

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          pageSize={20}
          onRowClick={setSelected}
          empty={{
            icon: <ScrollText />,
            title: 'No audit entries match',
            description: 'Every change in the console lands here. Loosen the filters to see more.',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAction('all')
                  setTenantFilter('all')
                  setQuery('')
                }}
              >
                Clear filters
              </Button>
            ),
          }}
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
