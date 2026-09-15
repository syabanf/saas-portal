import { accessSeries, dashboardKpis, fmtAgo, fmtCompact, fmtIdr, fmtNumber } from '@scp/fixtures'
import {
  ACCESS_REASON_LABEL,
  BILLING_PERIOD_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
  type SubscriptionStatus,
} from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Kicker,
  ProgressBar,
  StatCard,
  ViewSwitcher,
  cn,
} from '@scp/ui'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CreditCard,
  Receipt,
  ShieldX,
  Webhook,
  WifiOff,
} from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { DecisionBadge, SubscriptionBadge } from '../../components/badges'
import { useScoped } from '../../state/app-state'

type View = 'commercial' | 'access'

const STATUS_BAR: Record<SubscriptionStatus, string> = {
  active: 'bg-success',
  trial: 'bg-info',
  past_due: 'bg-warning',
  grace_period: 'bg-warning/70',
  suspended: 'bg-accent',
  cancelled: 'bg-silver',
  expired: 'bg-border',
  draft: 'bg-surface-2',
}

export function DashboardPage() {
  const { state, applicationsById, tenantsById, usersById } = useScoped()
  const [params] = useSearchParams()
  const [view, setView] = React.useState<View>(params.get('attention') ? 'access' : 'commercial')
  const now = Date.now()
  const kpis = React.useMemo(() => dashboardKpis(state, now), [state, now])
  const series = React.useMemo(() => accessSeries(state, now, 12), [state, now])
  const maxBucket = Math.max(1, ...series.map((b) => b.allow + b.deny))

  const deniedByApp = React.useMemo(() => {
    const since = now - 86_400_000
    const map = new Map<string, number>()
    for (const l of state.accessLogs) {
      if (new Date(l.at).getTime() < since) continue
      map.set(l.applicationId, (map.get(l.applicationId) ?? 0) + (l.decision === 'deny' ? 1 : 0))
    }
    return map
  }, [state.accessLogs, now])

  const recentDecisions = state.accessLogs.slice(0, view === 'access' ? 12 : 6)
  const paymentIssues = state.subscriptions
    .filter(
      (s) => s.status === 'past_due' || s.status === 'grace_period' || s.status === 'suspended',
    )
    .slice(0, 6)
  const latest = state.accessLogs[0]
  const attentionTotal = kpis.pastDueAccounts + kpis.failedWebhooks + kpis.integrationsOffline

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-[14rem] flex-1">
            <p className="font-semibold">Manage a customer workspace</p>
            <p className="text-muted text-sm">
              Start with an organization to review its people, access, subscriptions, and invoices
              together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/organizations/new">Create organization</Link>
            </Button>
            <Button asChild>
              <Link to="/organizations">Find organization</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewSwitcher
          value={view}
          onChange={setView}
          options={[
            { value: 'commercial', label: 'Commercial' },
            { value: 'access', label: 'Access' },
          ]}
        />
        <p className="text-muted hidden text-xs md:block">Platform point of view · last 24 hours</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-hero bg-ink text-on-ink shadow-float relative overflow-hidden p-6">
          <div className="bg-accent/30 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
          <div className="relative flex h-full flex-col">
            <Kicker className="text-on-ink-muted">Access broker · today</Kicker>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Commercial access decisions</h2>
            <p className="text-on-ink-muted text-sm">
              Every application entry the backend checked against organization and subscription
              state.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div className="flex items-start gap-1 leading-none">
                <span className="text-6xl font-bold tracking-tight tabular-nums">
                  {fmtCompact(kpis.accessToday)}
                </span>
                <span className="text-on-ink-muted pt-1 text-sm font-semibold">requests</span>
              </div>
              <div className="flex items-start gap-1 leading-none">
                <span className="text-accent text-3xl font-bold tracking-tight tabular-nums">
                  {fmtNumber(kpis.deniedToday)}
                </span>
                <span className="text-on-ink-muted pt-1 text-sm font-semibold">denied</span>
              </div>
            </div>
            <div className="mt-5 flex h-12 items-end gap-1">
              {series.map((b, i) => {
                const total = b.allow + b.deny
                const h = Math.max(6, Math.round((total / maxBucket) * 48))
                const denyH = total === 0 ? 0 : Math.round((b.deny / total) * h)
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col justify-end overflow-hidden rounded-sm"
                    style={{ height: h }}
                  >
                    <div className="w-full flex-1 bg-white/25" />
                    {denyH > 0 ? (
                      <div className="bg-accent w-full" style={{ height: denyH }} />
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.applications
                .filter((a) => a.status === 'active')
                .slice(0, 5)
                .map((a) => {
                  const denied = deniedByApp.get(a.id) ?? 0
                  return (
                    <Link
                      key={a.id}
                      to={`/applications/${a.id}`}
                      className={cn(
                        'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors',
                        denied > 0
                          ? 'border-accent bg-accent text-white'
                          : 'border-white/10 bg-white/10 text-white hover:bg-white/15',
                      )}
                    >
                      {a.name}
                      {denied > 0 ? (
                        <span className="rounded-full bg-white/20 px-1.5 tabular-nums">
                          {denied}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
            </div>
            {latest ? (
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3 text-sm">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    latest.decision === 'allow' ? 'bg-success' : 'bg-accent animate-pulse',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">
                    {usersById.get(latest.userId)?.name ?? latest.userId}
                  </span>
                  <span className="text-on-ink-muted">
                    {' '}
                    · {tenantsById.get(latest.tenantId)?.name} →{' '}
                    {applicationsById.get(latest.applicationId)?.name}
                  </span>
                </span>
                <span className="text-on-ink-muted text-xs">
                  {ACCESS_REASON_LABEL[latest.reason]} · {fmtAgo(latest.at, now)}
                </span>
              </div>
            ) : null}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <Badge className="border border-white/10 bg-white/10 text-white">
                Mock control plane
              </Badge>
              <Badge className="border border-white/10 bg-white/10 text-white">
                Token TTL 15 min
              </Badge>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-white/10 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link to="/logs">Access logs</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/audit">
                    Audit trail <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-hero bg-accent shadow-glow p-6 text-white">
            <Kicker className="text-white/70">Needs attention</Kicker>
            <div className="mt-2 flex items-start gap-1 leading-none">
              <span className="text-5xl font-bold tracking-tight tabular-nums">
                {attentionTotal}
              </span>
              <span className="pt-1 text-sm font-semibold text-white/70">items</span>
            </div>
            <ProgressBar
              value={kpis.pastDueAccounts}
              max={Math.max(1, attentionTotal)}
              tone="onDark"
              className="mt-4"
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Link
                to="/subscriptions?status=past_due"
                className="rounded-2xl bg-white/15 p-2.5 transition-colors hover:bg-white/25"
              >
                <span className="block text-lg font-bold tabular-nums">{kpis.pastDueAccounts}</span>
                <span className="text-white/80">Past due</span>
              </Link>
              <Link
                to="/webhooks"
                className="rounded-2xl bg-white/15 p-2.5 transition-colors hover:bg-white/25"
              >
                <span className="block text-lg font-bold tabular-nums">{kpis.failedWebhooks}</span>
                <span className="text-white/80">Failed hooks</span>
              </Link>
              <Link
                to="/health"
                className="rounded-2xl bg-white/15 p-2.5 transition-colors hover:bg-white/25"
              >
                <span className="block text-lg font-bold tabular-nums">
                  {kpis.integrationsOffline}
                </span>
                <span className="text-white/80">Offline</span>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              label="Denied requests"
              value={fmtNumber(kpis.deniedToday)}
              hint="Last 24 hours"
              icon={<ShieldX />}
              tone="danger"
            />
            <StatCard
              label="Payment issues"
              value={fmtNumber(kpis.paymentIssues)}
              hint="Subscriptions"
              icon={<CreditCard />}
              tone="warning"
            />
          </div>
        </div>
      </div>

      <div className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto sm:grid sm:grid-cols-3 sm:gap-4 [&>*]:min-w-[72%] [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard
          label="Organizations"
          value={fmtNumber(kpis.organizations)}
          hint={`${state.tenants.filter((t) => t.status === 'active').length} active`}
          icon={<Building2 />}
          tone="ink"
        />
        <StatCard
          label="Active subscriptions"
          value={fmtNumber(kpis.activeSubscriptions)}
          hint={`${kpis.trialSubscriptions} on trial`}
          icon={<Receipt />}
          tone="success"
        />
        <StatCard
          label="Monthly recurring revenue"
          value={fmtIdr(kpis.mrr)}
          hint="Annual subscriptions counted per month"
          icon={<Activity />}
          tone="info"
        />
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-4',
          view === 'commercial' && 'md:grid-cols-2 xl:grid-cols-[1fr_1fr_20rem]',
        )}
      >
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              {view === 'access' ? 'Recent decisions' : 'Latest access'}{' '}
              <Badge variant="muted">{recentDecisions.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/logs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDecisions.length === 0 ? (
              <EmptyState
                title="No access requests yet"
                description="Decisions appear here as users open applications."
              />
            ) : (
              recentDecisions.map((l) => (
                <div key={l.id} className="bg-surface-2 flex items-center gap-3 rounded-2xl p-3">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4',
                      l.decision === 'allow'
                        ? 'bg-success-soft text-success'
                        : 'bg-accent-soft text-accent',
                    )}
                  >
                    {l.decision === 'allow' ? <Activity /> : <ShieldX />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {usersById.get(l.userId)?.name ?? l.userId} →{' '}
                      {applicationsById.get(l.applicationId)?.name ?? l.applicationId}
                    </p>
                    <p className="text-muted truncate text-xs">
                      {tenantsById.get(l.tenantId)?.name} · {ACCESS_REASON_LABEL[l.reason]}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                      <DecisionBadge decision={l.decision} />
                      <span className="text-muted text-xs">{fmtAgo(l.at, now)}</span>
                    </div>
                  </div>
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    <DecisionBadge decision={l.decision} />
                    <span className="text-muted text-xs">{fmtAgo(l.at, now)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {view === 'commercial' ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  Payment issues <Badge variant="muted">{paymentIssues.length}</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/billing">Billing</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {paymentIssues.length === 0 ? (
                  <EmptyState
                    title="All accounts in good standing"
                    description="No past due, grace or suspended subscriptions."
                  />
                ) : (
                  paymentIssues.map((s) => (
                    <Link
                      key={s.id}
                      to={`/subscriptions/${s.id}`}
                      className="bg-surface-2 hover:bg-card hover:shadow-card flex items-center gap-3 rounded-2xl p-3 transition-colors"
                    >
                      <span className="bg-warning-soft text-warning flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4">
                        <AlertTriangle />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {tenantsById.get(s.tenantId)?.name}
                        </p>
                        <p className="text-muted truncate text-xs">
                          {applicationsById.get(s.applicationId)?.name} ·{' '}
                          {BILLING_PERIOD_LABEL[s.billingPeriod]}
                        </p>
                      </div>
                      <SubscriptionBadge status={s.status} />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle>Subscriptions by status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-surface flex h-3 w-full overflow-hidden rounded-full">
                  {SUBSCRIPTION_STATUSES.map((st) => {
                    const n = kpis.statusBreakdown[st]
                    if (!n) return null
                    return (
                      <div
                        key={st}
                        className={STATUS_BAR[st]}
                        style={{ width: `${(n / state.subscriptions.length) * 100}%` }}
                        title={SUBSCRIPTION_STATUS_LABEL[st]}
                      />
                    )
                  })}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {SUBSCRIPTION_STATUSES.map((st) => (
                    <li key={st} className="flex items-center gap-2">
                      <span className={cn('size-2.5 rounded-full', STATUS_BAR[st])} />
                      <span className="text-body flex-1">{SUBSCRIPTION_STATUS_LABEL[st]}</span>
                      <span className="font-semibold tabular-nums">{kpis.statusBreakdown[st]}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <Link
                    to="/webhooks"
                    className="bg-surface-2 hover:bg-surface flex items-center gap-2 rounded-2xl p-3"
                  >
                    <Webhook className="text-muted size-4" />
                    <span>
                      <span className="block text-base font-bold tabular-nums">
                        {kpis.failedWebhooks}
                      </span>
                      failed hooks
                    </span>
                  </Link>
                  <Link
                    to="/health"
                    className="bg-surface-2 hover:bg-surface flex items-center gap-2 rounded-2xl p-3"
                  >
                    <WifiOff className="text-muted size-4" />
                    <span>
                      <span className="block text-base font-bold tabular-nums">
                        {kpis.integrationsWithIssues}
                      </span>
                      with issues
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}
