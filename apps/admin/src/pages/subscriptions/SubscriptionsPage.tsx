import { fmtDate, fmtDaysUntil, fmtIdr, fmtNumber, monthlyValue } from '@scp/fixtures'
import type { Subscription, SubscriptionStatus } from '@scp/types'
import { BILLING_PERIOD_LABEL, SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABEL } from '@scp/types'
import {
  Button,
  Card,
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
  Select,
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
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { SubscriptionBadge } from '../../components/badges'
import { SubscriptionDialog, emptySubscription } from '../../components/master/SubscriptionDialog'
import { actorOf, useScoped } from '../../state/app-state'
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

function isStatus(value: string | null): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

export function SubscriptionsPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { subscriptions, applications, tenantsById, applicationsById, dispatch } = useScoped()
  const [params, setParams] = useSearchParams()
  const statusParam = params.get('status')
  const tab: 'all' | SubscriptionStatus = isStatus(statusParam) ? statusParam : 'all'
  const [query, setQuery] = React.useState('')
  const [applicationId, setApplicationId] = React.useState('')
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
      if (applicationId && s.applicationId !== applicationId) return false
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
  }, [subscriptions, tab, applicationId, query, tenantsById, applicationsById])

  function selectTab(value: string) {
    setParams(value === 'all' ? {} : { status: value }, { replace: true })
  }

  function clearFilters() {
    setQuery('')
    setApplicationId('')
    selectTab('all')
  }

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
          <>
            <Select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              aria-label="Filter by application"
              className="[&_select]:shadow-card w-full sm:w-52 [&_select]:rounded-full [&_select]:border-0"
            >
              <option value="">All applications</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <Input
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organization or application"
              className="[&_input]:shadow-card w-full sm:w-72 [&_input]:rounded-full [&_input]:border-0"
            />
            <Button onClick={() => setEditing(emptySubscription())}>
              <Plus /> New subscription
            </Button>
          </>
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

        <Tabs value={tab} onValueChange={selectTab}>
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
              title:
                subscriptions.length === 0
                  ? 'No subscriptions yet'
                  : `No ${tab === 'all' ? '' : SUBSCRIPTION_STATUS_LABEL[tab].toLowerCase() + ' '}subscriptions match`,
              description:
                subscriptions.length === 0
                  ? 'Subscribe an organization to an application to start.'
                  : 'Try another status tab, application or search.',
              action:
                subscriptions.length === 0 ? (
                  <Button size="sm" onClick={() => setEditing(emptySubscription())}>
                    New subscription
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
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
