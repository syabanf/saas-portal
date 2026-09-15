import { fmtDate, fmtDaysUntil, fmtIdr, fmtNumber, monthlyValue } from '@scp/fixtures'
import type { Subscription, SubscriptionStatus } from '@scp/types'
import {
  BILLING_PERIODS,
  BILLING_PERIOD_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Button,
  Card,
  Combobox,
  ConfirmDelete,
  CountBadge,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  PageHeader,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from '@scp/ui'
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { SubscriptionBadge } from '../../components/badges'
import { SubscriptionDialog, emptySubscription } from '../../components/master/SubscriptionDialog'
import { actorOf, useScoped } from '../../state/app-state'
import {
  PILL_COMBOBOX,
  PILL_INPUT,
  endsWithinDays,
  useUrlFilters,
  windowDays,
  type WindowOption,
} from '../../lib/filters'
import { allOption, applicationOptions, labelOptions, tenantOptions } from '../../lib/options'
import { ChangePeriodDialog } from './ChangePeriodDialog'

const TAB_ORDER: SubscriptionStatus[] = [
  'active',
  'trial',
  'past_due',
  'grace_period',
  'suspended',
  'cancelled',
  'expired',
  'draft',
]

const ENDS_WINDOWS: WindowOption[] = [
  { value: 'all', label: 'Ends any time', days: null },
  { value: '7', label: 'Ends within 7 days', days: 7 },
  { value: '30', label: 'Ends within 30 days', days: 30 },
  { value: '90', label: 'Ends within 90 days', days: 90 },
]
const FILTER_KEYS = ['status', 'app', 'tenant', 'period', 'ends', 'q'] as const

function isStatus(value: string): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

export function SubscriptionsPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { subscriptions, applications, tenants, tenantsById, applicationsById, dispatch } =
    useScoped()
  const filters = useUrlFilters(FILTER_KEYS)
  const statusParam = filters.get('status')
  const tab: 'all' | SubscriptionStatus = isStatus(statusParam) ? statusParam : 'all'
  const query = filters.get('q', '')
  const applicationId = filters.get('app')
  const tenantId = filters.get('tenant')
  const period = filters.get('period')
  const endsDays = windowDays(ENDS_WINDOWS, filters.get('ends'))
  const [editing, setEditing] = React.useState<Subscription | null>(null)
  const [changingPeriod, setChangingPeriod] = React.useState<Subscription | null>(null)
  const [removing, setRemoving] = React.useState<Subscription | null>(null)
  const now = Date.now()

  const stats = React.useMemo(() => {
    const counts = new Map<SubscriptionStatus, number>()
    let monthly = 0
    for (const s of subscriptions) {
      counts.set(s.status, (counts.get(s.status) ?? 0) + 1)
      if (s.status === 'active') monthly += monthlyValue(s)
    }
    return {
      counts,
      monthly,
      attention: (counts.get('past_due') ?? 0) + (counts.get('grace_period') ?? 0),
    }
  }, [subscriptions])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return subscriptions.filter((s) => {
      if (tab !== 'all' && s.status !== tab) return false
      if (applicationId !== 'all' && s.applicationId !== applicationId) return false
      if (tenantId !== 'all' && s.tenantId !== tenantId) return false
      if (period !== 'all' && s.billingPeriod !== period) return false
      if (!endsWithinDays(s.currentPeriodEnd, endsDays, now)) return false
      if (!q) return true
      const hay = [
        tenantsById.get(s.tenantId)?.name,
        applicationsById.get(s.applicationId)?.name,
        s.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [
    subscriptions,
    tab,
    applicationId,
    tenantId,
    period,
    endsDays,
    now,
    query,
    tenantsById,
    applicationsById,
  ])

  const appName = (s: Subscription) =>
    applicationsById.get(s.applicationId)?.name ?? s.applicationId
  const actor = actorOf(user)
  const columns: Column<Subscription>[] = [
    {
      key: 'tenant',
      header: 'Organization',
      cell: (s) => (
        <Link
          to={`/organizations/${s.tenantId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold hover:underline"
        >
          {tenantsById.get(s.tenantId)?.name ?? s.tenantId}
        </Link>
      ),
      sortValue: (s) => tenantsById.get(s.tenantId)?.name ?? '',
    },
    { key: 'application', header: 'Application', cell: appName, sortValue: appName },
    {
      key: 'billing',
      header: 'Billing',
      cell: (s) => (
        <>
          <span className="block">{BILLING_PERIOD_LABEL[s.billingPeriod]}</span>
          <span className="text-muted block text-xs tabular-nums">
            {fmtIdr(s.price, s.currency)}
          </span>
        </>
      ),
      sortValue: (s) => monthlyValue(s),
    },
    { key: 'status', header: 'Status', cell: (s) => <SubscriptionBadge status={s.status} /> },
    {
      key: 'periodEnd',
      header: 'Period end',
      cell: (s) => fmtDate(s.currentPeriodEnd),
      sortValue: (s) => s.currentPeriodEnd,
    },
    {
      key: 'grace',
      header: 'Grace ends',
      cell: (s) =>
        s.gracePeriodEnd ? (
          <span className="text-warning">{fmtDaysUntil(s.gracePeriodEnd, now)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Which organization subscribes to which application. Status decides access; payment never does on its own."
        actions={
          <Button onClick={() => setEditing(emptySubscription())}>
            <Plus /> New subscription
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Monthly recurring"
            value={fmtIdr(stats.monthly)}
            hint="Active subscriptions, annual spread over 12 months"
            icon={<Wallet />}
            tone="ink"
          />
          <StatCard
            label="Active"
            value={fmtNumber(stats.counts.get('active') ?? 0)}
            hint="Paying organizations"
            icon={<CheckCircle2 />}
            tone="success"
          />
          <StatCard
            label="Needs attention"
            value={fmtNumber(stats.attention)}
            hint="Past due or in grace period"
            icon={<AlertTriangle />}
            tone="warning"
          />
          <StatCard
            label="Trials"
            value={fmtNumber(stats.counts.get('trial') ?? 0)}
            hint="Not yet invoiced"
            icon={<Clock />}
            tone="info"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => filters.set('status', v)}>
          <TabsList>
            <TabsTrigger value="all">
              All{' '}
              <CountBadge count={subscriptions.length} className="bg-surface text-body ring-0" />
            </TabsTrigger>
            {TAB_ORDER.map((st) => (
              <TabsTrigger key={st} value={st}>
                {SUBSCRIPTION_STATUS_LABEL[st]}{' '}
                <CountBadge
                  count={stats.counts.get(st) ?? 0}
                  className="bg-surface text-body ring-0"
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            leftIcon={<Search />}
            value={query}
            onChange={(e) => filters.set('q', e.target.value)}
            placeholder="Search organization or application"
            aria-label="Search subscriptions"
            className={`w-full sm:w-64 ${PILL_INPUT}`}
          />
          <Combobox
            value={tenantId}
            onChange={(v) => filters.set('tenant', v)}
            options={[allOption('All organizations'), ...tenantOptions(tenants)]}
            searchPlaceholder="Search organizations"
            className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
          />
          <Combobox
            value={applicationId}
            onChange={(v) => filters.set('app', v)}
            options={[allOption('All applications'), ...applicationOptions(applications)]}
            searchPlaceholder="Search applications"
            className={`w-full sm:w-52 ${PILL_COMBOBOX}`}
          />
          <Combobox
            value={period}
            onChange={(v) => filters.set('period', v)}
            options={[
              allOption('All billing periods'),
              ...labelOptions(BILLING_PERIODS, BILLING_PERIOD_LABEL),
            ]}
            className={`w-full sm:w-44 ${PILL_COMBOBOX}`}
          />
          <Combobox
            value={filters.get('ends')}
            onChange={(v) => filters.set('ends', v)}
            options={ENDS_WINDOWS}
            className={`w-full sm:w-48 ${PILL_COMBOBOX}`}
          />
          {filters.active ? (
            <Button variant="ghost" size="sm" onClick={filters.clear}>
              Clear filters
            </Button>
          ) : null}
        </div>

        <Card>
          <DataTable
            rows={visible}
            columns={columns}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/subscriptions/${s.id}`)}
            rowActions={(s) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Subscription actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change status</DropdownMenuLabel>
                  {SUBSCRIPTION_STATUSES.map((st) => (
                    <DropdownMenuItem
                      key={st}
                      disabled={st === s.status}
                      onSelect={() =>
                        dispatch({ type: 'subscriptions/setStatus', id: s.id, status: st, actor })
                      }
                    >
                      {SUBSCRIPTION_STATUS_LABEL[st]}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={s.status === 'cancelled'}
                    onSelect={() => dispatch({ type: 'subscriptions/cancel', id: s.id, actor })}
                  >
                    <Ban /> Cancel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={s.status === 'active'}
                    onSelect={() => dispatch({ type: 'subscriptions/reactivate', id: s.id, actor })}
                  >
                    <RotateCcw /> Reactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setChangingPeriod(s)}>
                    <ArrowLeftRight /> Change billing period
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setEditing(s)}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onSelect={() => setRemoving(s)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            empty={{
              icon: <Receipt />,
              title: subscriptions.length === 0 ? 'No subscriptions yet' : 'No matches',
              description:
                subscriptions.length === 0
                  ? 'Subscribe an organization to an application to start.'
                  : 'Try another status tab, organization, application or search.',
              action:
                subscriptions.length === 0 ? (
                  <Button size="sm" onClick={() => setEditing(emptySubscription())}>
                    New subscription
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={filters.clear}>
                    Clear filters
                  </Button>
                ),
            }}
          />
        </Card>
      </div>

      <SubscriptionDialog
        subscription={editing}
        onOpenChange={(open) => (open ? undefined : setEditing(null))}
      />
      <ChangePeriodDialog
        subscription={changingPeriod}
        onOpenChange={(open) => (open ? undefined : setChangingPeriod(null))}
      />
      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title="Delete subscription?"
        description={`${tenantsById.get(removing?.tenantId ?? '')?.name ?? 'The organization'} loses access to ${removing ? appName(removing) : 'the application'} immediately. Its invoices and payments are removed too.`}
        onConfirm={() => {
          if (removing) dispatch({ type: 'subscriptions/remove', id: removing.id })
          setRemoving(null)
        }}
      />
    </div>
  )
}
