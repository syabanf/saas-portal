import { fmtDate, fmtNumber } from '@scp/fixtures'
import type { Tenant, TenantStatus } from '@scp/types'
import { BILLING_PERIOD_LABEL, TENANT_STATUS_LABEL } from '@scp/types'
import {
  Button,
  Card,
  Combobox,
  ConfirmDelete,
  DataTable,
  Input,
  PageHeader,
  StatCard,
  cn,
  type BadgeTone,
  type Column,
} from '@scp/ui'
import {
  Building2,
  CheckCircle2,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShieldBan,
  Trash2,
  X,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { Mono, SUBSCRIPTION_TONE, TenantBadge } from '../../components/badges'
import { TenantDialog, countryLabel } from '../../components/master/TenantDialog'
import { PILL_COMBOBOX, PILL_INPUT, useFilterParams } from '../../lib/filters'
import { applicationOptions, labelOptions, withAll } from '../../lib/options'
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
const FILTER_KEYS = ['q', 'status', 'app', 'country'] as const

export function OrganizationsPage() {
  const {
    tenants,
    applications,
    subscriptions,
    subscriptionsByTenant,
    membersByTenant,
    applicationsById,
    dispatch,
  } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const filters = useFilterParams(FILTER_KEYS)
  const { q: query, status, app, country } = filters.values
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

  const stats = React.useMemo(() => {
    const byStatus: Record<TenantStatus, number> = { active: 0, suspended: 0, pending: 0 }
    for (const t of tenants) byStatus[t.status] += 1
    let activeSubs = 0
    let trialSubs = 0
    for (const s of subscriptions) {
      if (s.status === 'active') activeSubs += 1
      if (s.status === 'trial') trialSubs += 1
    }
    return { ...byStatus, activeSubs, trialSubs }
  }, [tenants, subscriptions])

  const countryFilters = React.useMemo(
    () =>
      [...new Set(tenants.map((t) => t.country))]
        .sort()
        .map((code) => ({ value: code, label: countryLabel(code) })),
    [tenants],
  )

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tenants.filter(
      (t) =>
        (!status || t.status === status) &&
        (!country || t.country === country) &&
        (!app || (subscriptionsByTenant.get(t.id) ?? []).some((s) => s.applicationId === app)) &&
        (!needle ||
          t.name.toLowerCase().includes(needle) ||
          t.code.toLowerCase().includes(needle) ||
          t.billingEmail.toLowerCase().includes(needle)),
    )
  }, [tenants, subscriptionsByTenant, query, status, app, country])

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
          <Button onClick={() => navigate('/organizations/new')}>
            <Plus /> Add organization
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Organizations"
          value={fmtNumber(tenants.length)}
          hint="All workspaces"
          icon={<Building2 />}
          tone="ink"
        />
        <StatCard
          label="Active"
          value={fmtNumber(stats.active)}
          hint="Members can sign in"
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="Suspended or pending"
          value={fmtNumber(stats.suspended + stats.pending)}
          hint={`${stats.suspended} suspended · ${stats.pending} pending`}
          icon={<ShieldBan />}
          tone={stats.suspended > 0 ? 'danger' : 'warning'}
        />
        <StatCard
          label="Subscriptions"
          value={fmtNumber(stats.activeSubs)}
          hint={`${stats.trialSubs} on trial`}
          icon={<Receipt />}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          placeholder="Search name, code or billing email"
          leftIcon={<Search />}
          className={cn('w-full sm:w-72', PILL_INPUT)}
        />
        <Combobox
          value={status || 'all'}
          onChange={(v) => filters.set('status', v)}
          options={withAll('All statuses', labelOptions(STATUS_FILTERS, TENANT_STATUS_LABEL))}
          searchPlaceholder="Search statuses…"
          className={cn('w-full sm:w-44', PILL_COMBOBOX)}
        />
        <Combobox
          value={app || 'all'}
          onChange={(v) => filters.set('app', v)}
          options={withAll('All applications', applicationOptions(applications))}
          searchPlaceholder="Search applications…"
          className={cn('w-full sm:w-52', PILL_COMBOBOX)}
        />
        <Combobox
          value={country || 'all'}
          onChange={(v) => filters.set('country', v)}
          options={withAll('All countries', countryFilters)}
          searchPlaceholder="Search countries…"
          className={cn('w-full sm:w-44', PILL_COMBOBOX)}
        />
        {filters.active ? <ClearFiltersButton onClick={filters.clear} /> : null}
      </div>

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
          empty={
            filters.active
              ? {
                  icon: <Building2 />,
                  title: 'No matches',
                  description: 'Try a different name, code, status, application or country.',
                  action: <ClearFiltersButton onClick={filters.clear} />,
                }
              : {
                  icon: <Building2 />,
                  title: 'No organizations yet',
                  description:
                    'Onboard the first customer to create its workspace, subscription and admin.',
                  action: (
                    <Button onClick={() => navigate('/organizations/new')}>
                      <Plus /> Add organization
                    </Button>
                  ),
                }
          }
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
