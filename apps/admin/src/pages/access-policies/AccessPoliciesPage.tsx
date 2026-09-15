import { fmtNumber } from '@scp/fixtures'
import type { AccessPolicyMode, AccessPolicyOutcome, Application } from '@scp/types'
import {
  ACCESS_POLICY_LABEL,
  SUBSCRIPTION_ACCESS_POLICY,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  Combobox,
  EmptyState,
  IconTile,
  Input,
  PageHeader,
  StatCard,
  type BadgeTone,
} from '@scp/ui'
import {
  AppWindow,
  Building2,
  Check,
  FileCheck,
  Gift,
  KeyRound,
  ListChecks,
  Receipt,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { AppTypeIcon, Mono, SUBSCRIPTION_TONE } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { PILL_COMBOBOX, PILL_INPUT, useUrlFilters } from '../../lib/filters'
import { allOption, labelOptions } from '../../lib/options'

const OUTCOME: Record<AccessPolicyOutcome, { label: string; tone: BadgeTone }> = {
  allow: { label: 'ALLOW', tone: 'success' },
  allow_warning: { label: 'ALLOW + WARNING', tone: 'warning' },
  allow_until_end: { label: 'ALLOW UNTIL PERIOD END', tone: 'info' },
  deny: { label: 'DENY', tone: 'danger' },
}

const CHAIN = [
  {
    icon: <KeyRound />,
    title: 'Validate SaaS token',
    detail: 'Signature, issuer, expiry, audience saas-platform',
  },
  { icon: <UserCheck />, title: 'Resolve user', detail: 'Active account, not disabled' },
  {
    icon: <Building2 />,
    title: 'Resolve tenant',
    detail: 'Organization exists and is not suspended',
  },
  {
    icon: <AppWindow />,
    title: 'Resolve application',
    detail: 'Application active, user assigned',
  },
  {
    icon: <Receipt />,
    title: 'Check subscription',
    detail: 'Status against default and per-app policy',
  },
  {
    icon: <Wallet />,
    title: 'Check account state',
    detail: 'Billing standing, grace period warnings',
  },
  {
    icon: <ShieldCheck />,
    title: 'Allow / deny',
    detail: 'Decision logged with a standard reason',
  },
  {
    icon: <FileCheck />,
    title: 'Issue app authorization',
    detail: 'Single-use code, then a short-lived app token',
  },
]

const TOKEN_LIFETIMES = [5, 10, 15, 30].map((m) => ({ value: String(m), label: `Token ${m} min` }))
const POLICY_MODES = Object.keys(ACCESS_POLICY_LABEL) as AccessPolicyMode[]
const POLICY_OPTIONS = labelOptions(POLICY_MODES, ACCESS_POLICY_LABEL)
const FILTER_KEYS = ['policy', 'q'] as const

export function AccessPoliciesPage() {
  const { applications, subscriptionsByApplication, dispatch } = useScoped()
  const user = useCurrentUser()
  const filters = useUrlFilters(FILTER_KEYS)
  const policy = filters.get('policy')
  const query = filters.get('q', '')

  function updateApp(app: Application, patch: Partial<Application>) {
    dispatch({
      type: 'applications/upsert',
      application: { ...app, ...patch, updatedAt: new Date().toISOString() },
      actor: actorOf(user),
    })
  }

  const gated = applications.filter((a) => a.accessPolicy === 'subscription')
  const free = applications.filter((a) => a.accessPolicy === 'free').length
  const manual = applications.filter((a) => a.accessPolicy === 'manual').length
  const avgAllowed =
    gated.length === 0
      ? 0
      : Math.round(
          (gated.reduce((sum, a) => sum + a.allowedStatuses.length, 0) / gated.length) * 10,
        ) / 10
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter(
      (a) =>
        (policy === 'all' || a.accessPolicy === policy) &&
        (!q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)),
    )
  }, [applications, policy, query])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Access policies"
        description="How subscription state turns into an allow or deny for each application. The backend enforces every decision."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Subscription-gated"
          value={fmtNumber(gated.length)}
          hint="Products that need a subscription"
          icon={<Receipt />}
          tone="ink"
        />
        <StatCard
          label="Free"
          value={fmtNumber(free)}
          hint="Open to every workspace user"
          icon={<Gift />}
          tone="success"
        />
        <StatCard
          label="Manual access"
          value={fmtNumber(manual)}
          hint="Assigned per member"
          icon={<UserCheck />}
          tone="info"
        />
        <StatCard
          label="Statuses allowed"
          value={fmtNumber(avgAllowed)}
          hint="Average per gated product"
          icon={<ListChecks />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default subscription policy</CardTitle>
            <CardDescription>Policy can be narrowed per application below.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted h-10 px-5 text-left text-xs font-semibold tracking-wide uppercase">
                      Status
                    </th>
                    <th className="text-muted h-10 px-5 text-left text-xs font-semibold tracking-wide uppercase">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SUBSCRIPTION_STATUSES.map((s) => {
                    const o = OUTCOME[SUBSCRIPTION_ACCESS_POLICY[s]]
                    return (
                      <tr key={s} className="border-border border-b last:border-0">
                        <td className="px-5 py-2.5 font-medium">{SUBSCRIPTION_STATUS_LABEL[s]}</td>
                        <td className="px-5 py-2.5">
                          <Badge variant={o.tone}>{o.label}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access broker chain</CardTitle>
            <CardDescription>
              Every <Mono>POST /access/exchange</Mono> walks these steps in order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5">
              {CHAIN.map((step, i) => (
                <li
                  key={step.title}
                  className="bg-surface-2 flex items-center gap-3 rounded-2xl px-3 py-2"
                >
                  <IconTile size="sm" tone={i === CHAIN.length - 1 ? 'ink' : 'default'}>
                    {step.icon}
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {i + 1}. {step.title}
                    </span>
                    <span className="text-muted block truncate text-xs">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Per-application policy</CardTitle>
            <CardDescription>
              Who can enter each application, which subscription statuses are accepted, and how long
              its app token lives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                value={policy}
                onChange={(v) => filters.set('policy', v)}
                options={[allOption('All access policies'), ...POLICY_OPTIONS]}
                className={`w-full sm:w-64 ${PILL_COMBOBOX}`}
              />
              {filters.active ? (
                <Button variant="ghost" size="sm" onClick={filters.clear}>
                  Clear filters
                </Button>
              ) : null}
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<AppWindow />}
                title="No matches"
                description="Try another access policy or search."
                action={
                  <Button variant="outline" size="sm" onClick={filters.clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : null}
            {filtered.map((a) => (
              <div key={a.id} className="bg-surface-2 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <IconTile size="sm" tone="ink">
                    <AppTypeIcon type={a.type} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{a.name}</p>
                    <Mono className="text-muted">{a.code}</Mono>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[26rem]">
                    <Combobox
                      value={a.accessPolicy}
                      onChange={(v) => updateApp(a, { accessPolicy: v as AccessPolicyMode })}
                      options={POLICY_OPTIONS}
                    />
                    <Combobox
                      value={String(a.tokenLifetimeMinutes)}
                      onChange={(v) => updateApp(a, { tokenLifetimeMinutes: Number(v) })}
                      options={TOKEN_LIFETIMES}
                    />
                  </div>
                </div>
                {a.accessPolicy === 'subscription' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUBSCRIPTION_STATUSES.map((s) => {
                      const on = a.allowedStatuses.includes(s)
                      return (
                        <Chip
                          key={s}
                          active={on}
                          activeTone="ink"
                          className="h-8"
                          onClick={() =>
                            updateApp(a, {
                              allowedStatuses: on
                                ? a.allowedStatuses.filter((x) => x !== s)
                                : [...a.allowedStatuses, s],
                            })
                          }
                        >
                          {on ? <Check /> : null}
                          {SUBSCRIPTION_STATUS_LABEL[s]}
                        </Chip>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Subscriptions per application</CardTitle>
            <CardDescription>
              Current subscription counts for every application that requires one. Read only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gated.length === 0 ? (
              <p className="text-muted text-sm">No application requires a subscription.</p>
            ) : null}
            {gated.map((a) => {
              const subs = subscriptionsByApplication.get(a.id) ?? []
              const counts = SUBSCRIPTION_STATUSES.map((s) => ({
                status: s,
                count: subs.filter((sub) => sub.status === s).length,
              })).filter((c) => c.count > 0)
              return (
                <div
                  key={a.id}
                  className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl p-3"
                >
                  <IconTile size="sm" tone="default">
                    <AppTypeIcon type={a.type} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{a.name}</p>
                    <p className="text-muted text-xs">
                      {subs.length} {subs.length === 1 ? 'subscription' : 'subscriptions'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {counts.length === 0 ? <Badge variant="muted">None yet</Badge> : null}
                    {counts.map((c) => (
                      <Badge key={c.status} variant={SUBSCRIPTION_TONE[c.status]} dot>
                        {SUBSCRIPTION_STATUS_LABEL[c.status]} {c.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
