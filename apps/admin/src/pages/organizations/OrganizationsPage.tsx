import { fmtDate } from '@scp/fixtures'
import type { Tenant, TenantStatus } from '@scp/types'
import { BILLING_PERIOD_LABEL, TENANT_STATUS_LABEL } from '@scp/types'
import {
  Button,
  Card,
  ConfirmDelete,
  DataTable,
  Input,
  PageHeader,
  Select,
  cn,
  type BadgeTone,
  type Column,
} from '@scp/ui'
import { Building2, CheckCircle2, Pencil, Plus, Search, ShieldBan, Trash2, X } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono, SUBSCRIPTION_TONE, TenantBadge } from '../../components/badges'
import { TenantDialog } from '../../components/master/TenantDialog'
import { actorOf, useScoped } from '../../state/app-state'

const DOT: Partial<Record<BadgeTone, string>> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  muted: 'bg-silver',
  default: 'bg-body',
}

const STATUS_FILTERS: TenantStatus[] = ['active', 'pending', 'suspended']

export function OrganizationsPage() {
  const { tenants, subscriptionsByTenant, membersByTenant, applicationsById, dispatch } =
    useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as TenantStatus | ''
  const [editing, setEditing] = React.useState<Tenant | null>(null)
  const [removing, setRemoving] = React.useState<Tenant | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setSelected(
      (current) => new Set([...current].filter((id) => tenants.some((tenant) => tenant.id === id))),
    )
  }, [tenants])

  function setSelectedStatus(nextStatus: TenantStatus) {
    for (const id of selected)
      dispatch({ type: 'tenants/setStatus', id, status: nextStatus, actor: actorOf(user) })
    setSelected(new Set())
  }

  function setParam(key: 'q' | 'status', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return tenants.filter(
      (t) =>
        (!status || t.status === status) &&
        (!q ||
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.billingEmail.toLowerCase().includes(q)),
    )
  }, [tenants, query, status])

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Organization',
      sortValue: (t) => t.name.toLowerCase(),
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.name}</p>
          <Mono>{t.code}</Mono>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (t) => t.status,
      cell: (t) => <TenantBadge status={t.status} />,
    },
    {
      key: 'subscriptions',
      header: 'Subscriptions',
      cell: (t) => {
        const subs = subscriptionsByTenant.get(t.id) ?? []
        if (subs.length === 0) return <span className="text-muted text-xs">None</span>
        return (
          <div className="flex flex-wrap gap-1.5">
            {subs.map((s) => (
              <span
                key={s.id}
                className="bg-surface inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    DOT[SUBSCRIPTION_TONE[s.status]] ?? 'bg-body',
                  )}
                />
                {applicationsById.get(s.applicationId)?.name ?? 'Application'} ·{' '}
                {BILLING_PERIOD_LABEL[s.billingPeriod]}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'members',
      header: 'Members',
      align: 'right',
      sortValue: (t) => membersByTenant.get(t.id)?.length ?? 0,
      cell: (t) => <span className="tabular-nums">{membersByTenant.get(t.id)?.length ?? 0}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: (t) => t.createdAt,
      cell: (t) => <span className="text-muted whitespace-nowrap">{fmtDate(t.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Organizations"
        description="Every subscription, user and invoice belongs to an organization."
        actions={
          <>
            <Input
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Search organizations…"
              leftIcon={<Search />}
              className="[&_input]:bg-card [&_input]:shadow-card w-full sm:w-72 [&_input]:rounded-full [&_input]:border-0"
            />
            <Select
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
              className="[&_select]:bg-card [&_select]:shadow-card w-full sm:w-44 [&_select]:rounded-full [&_select]:border-0"
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {TENANT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Button onClick={() => navigate('/organizations/new')}>
              <Plus /> Add organization
            </Button>
          </>
        }
      />
      {selected.size > 0 ? (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <p role="status" aria-live="polite" className="mr-auto text-sm font-semibold">
            {selected.size} organizations selected
          </p>
          <Button size="sm" variant="outline" onClick={() => setSelectedStatus('active')}>
            <CheckCircle2 /> Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedStatus('suspended')}>
            <ShieldBan /> Suspend
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </Card>
      ) : null}
      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(t) => t.id}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          selectionLabel="Select organization"
          onRowClick={(t) => navigate(`/organizations/${t.id}`)}
          rowActions={(t) => (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit"
                onClick={() => setEditing(t)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                className="text-accent"
                onClick={() => setRemoving(t)}
              >
                <Trash2 />
              </Button>
            </>
          )}
          empty={{
            icon: <Building2 />,
            title: query || status ? 'No organizations match' : 'No organizations yet',
            description:
              query || status
                ? 'Try a different name, code or status.'
                : 'Onboard the first customer to create its workspace, subscription and admin.',
            action: (
              <Button onClick={() => navigate('/organizations/new')}>
                <Plus /> Add organization
              </Button>
            ),
          }}
        />
      </Card>

      <TenantDialog tenant={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Delete ${removing?.name ?? 'organization'}?`}
        description="Its subscriptions, members and invoices are removed as well. Users keep their accounts."
        onConfirm={() => {
          if (removing) dispatch({ type: 'tenants/remove', id: removing.id, actor: actorOf(user) })
          setRemoving(null)
        }}
      />
    </div>
  )
}
