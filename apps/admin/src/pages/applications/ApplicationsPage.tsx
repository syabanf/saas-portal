import { integrationModeOf } from '@scp/fixtures'
import type { Application, ApplicationStatus, ApplicationType } from '@scp/types'
import {
  ACCESS_POLICY_LABEL,
  APPLICATION_STATUS_LABEL,
  APPLICATION_TYPE_LABEL,
  INTEGRATION_MODE_LABEL,
} from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Combobox,
  ConfirmDelete,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconTile,
  Input,
  SplitStats,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@scp/ui'
import {
  AlertTriangle,
  AppWindow,
  Ban,
  Building2,
  CheckCircle2,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { AppTypeIcon, HealthDot, Mono } from '../../components/badges'
import { useFilterParams } from '../../lib/filters'
import { labelOptions, withAll } from '../../lib/options'
import { actorOf, useScoped } from '../../state/app-state'
import { pricingLine } from './ProductFields'

type TypeTab = 'all' | ApplicationType
const TABS: { value: TypeTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'backend', label: 'Backend' },
  { value: 'external', label: 'External' },
]
const POLICY_FILTERS = withAll('All access policies', [
  { value: 'subscription', label: 'Subscription required' },
  { value: 'free', label: 'Free' },
  { value: 'manual', label: 'Manual' },
])
const STATUS_FILTERS = withAll(
  'All statuses',
  labelOptions(
    ['active', 'disabled', 'draft'] satisfies ApplicationStatus[],
    APPLICATION_STATUS_LABEL,
  ),
)
const SUBS_FILTERS = withAll('Any subscriptions', [
  { value: 'yes', label: 'Has subscriptions' },
  { value: 'no', label: 'No subscriptions' },
])
const FILTER_KEYS = ['q', 'type', 'policy', 'status', 'subs'] as const
const NESTED_PILL = 'w-full sm:w-52 [&_[role=combobox]]:h-10 [&_[role=combobox]]:rounded-full'

export function ApplicationsPage() {
  const {
    applications,
    subscriptionsByApplication,
    clientsByApplication,
    webhooksByApplication,
    dispatch,
  } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const filters = useFilterParams(FILTER_KEYS)
  const { q: query, type, policy, status, subs } = filters.values
  const tab: TypeTab = TABS.some((t) => t.value === type) ? (type as TypeTab) : 'all'
  const [removing, setRemoving] = React.useState<Application | null>(null)

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return applications.filter((a) => {
      const subscribed = (subscriptionsByApplication.get(a.id) ?? []).length > 0
      return (
        (tab === 'all' || a.type === tab) &&
        (!policy || a.accessPolicy === policy) &&
        (!status || a.status === status) &&
        (!subs || subscribed === (subs === 'yes')) &&
        (!needle || a.name.toLowerCase().includes(needle) || a.code.toLowerCase().includes(needle))
      )
    })
  }, [applications, subscriptionsByApplication, query, tab, policy, status, subs])

  const stats = React.useMemo(() => {
    const tenantsSubscribed = new Set<string>()
    for (const list of subscriptionsByApplication.values())
      for (const s of list) tenantsSubscribed.add(s.tenantId)
    return {
      active: applications.filter((a) => a.status === 'active').length,
      healthy: applications.filter((a) => a.health === 'healthy').length,
      gateway: applications.filter((a) => integrationModeOf(a) === 'gateway').length,
      subscribedOrganizations: tenantsSubscribed.size,
    }
  }, [applications, subscriptionsByApplication])

  function setStatus(app: Application, status: Application['status']) {
    dispatch({
      type: 'applications/upsert',
      application: { ...app, status, updatedAt: new Date().toISOString() },
      actor: actorOf(user),
    })
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[29px] font-extrabold tracking-[-1px]">Products</h1>
          <p className="text-body/70 mt-1 max-w-[30rem] text-sm">
            Every product organizations can subscribe to: how users sign in, what a subscription
            costs and how healthy the integration is.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/applications/new')}>
          <Plus /> Add product
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        <StatCard
          label="Products"
          value={applications.length}
          hint={`${stats.active} active`}
          icon={<AppWindow />}
          tone="ink"
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="Healthy"
          value={stats.healthy}
          hint="Integration health"
          icon={<CheckCircle2 />}
          tone="success"
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="With issues"
          value={applications.length - stats.healthy}
          hint="Webhook error or offline"
          icon={<AlertTriangle />}
          tone={applications.length - stats.healthy > 0 ? 'danger' : 'default'}
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="Gateway products"
          value={stats.gateway}
          hint="SaaS Gate forwards the request"
          icon={<KeyRound />}
          tone="info"
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="Subscribed organizations"
          value={stats.subscribedOrganizations}
          hint="Distinct organizations with a subscription"
          icon={<Building2 />}
          tone="default"
          className="bg-surface-2 shadow-none"
        />
      </div>

      <Tabs
        variant="underline"
        value={tab}
        onValueChange={(v) => filters.set('type', v)}
        className="mt-6 min-w-0"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          placeholder="Search products…"
          leftIcon={<Search />}
          className="[&_input]:bg-surface w-full sm:w-64 [&_input]:h-10 [&_input]:rounded-full [&_input]:border-0"
        />
        <Combobox
          tone="nested"
          value={policy || 'all'}
          onChange={(v) => filters.set('policy', v)}
          options={POLICY_FILTERS}
          searchPlaceholder="Search access policies…"
          className={NESTED_PILL}
        />
        <Combobox
          tone="nested"
          value={status || 'all'}
          onChange={(v) => filters.set('status', v)}
          options={STATUS_FILTERS}
          searchPlaceholder="Search statuses…"
          className={cn(NESTED_PILL, 'sm:w-40')}
        />
        <Combobox
          tone="nested"
          value={subs || 'all'}
          onChange={(v) => filters.set('subs', v)}
          options={SUBS_FILTERS}
          searchPlaceholder="Search…"
          className={cn(NESTED_PILL, 'sm:w-48')}
        />
        {filters.active ? <ClearFiltersButton onClick={filters.clear} /> : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<AppWindow />}
          title={filters.active ? 'No matches' : 'No products yet'}
          description={
            filters.active
              ? 'Try another search, type, access policy, status or subscription filter.'
              : 'Run the setup wizard to register the first product and its production client.'
          }
          action={
            filters.active ? (
              <ClearFiltersButton onClick={filters.clear} />
            ) : (
              <Button variant="secondary" onClick={() => navigate('/applications/new')}>
                <Plus /> Add product
              </Button>
            )
          }
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              subscriptions={(subscriptionsByApplication.get(a.id) ?? []).length}
              clients={
                (clientsByApplication.get(a.id) ?? []).filter((c) => c.status === 'active').length
              }
              webhooks={(webhooksByApplication.get(a.id) ?? []).length}
              onOpen={() => navigate(`/applications/${a.id}`)}
              menu={
                <ProductMenu
                  app={a}
                  onEdit={() => navigate(`/applications/${a.id}/edit`)}
                  onToggleStatus={() => setStatus(a, a.status === 'active' ? 'disabled' : 'active')}
                  onDelete={() => setRemoving(a)}
                />
              }
            />
          ))}
        </div>
      )}

      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Delete ${removing?.name ?? 'product'}?`}
        description="Its API clients, webhooks, deliveries and subscriptions are removed, and it disappears from every member assignment."
        onConfirm={() => {
          if (removing) dispatch({ type: 'applications/remove', id: removing.id })
          setRemoving(null)
        }}
      />
    </Card>
  )
}

function ProductMenu({
  app,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  app: Application
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${app.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleStatus}>
          {app.status === 'active' ? (
            <>
              <Ban /> Disable
            </>
          ) : (
            <>
              <CheckCircle2 /> Enable
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onDelete}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Card body opens the detail page; the kebab keeps its own click scope so menu actions never open the card. */
function ApplicationCard({
  app,
  subscriptions,
  clients,
  webhooks,
  onOpen,
  menu,
}: {
  app: Application
  subscriptions: number
  clients: number
  webhooks: number
  onOpen: () => void
  menu: React.ReactNode
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        'rounded-card bg-card shadow-card flex cursor-pointer flex-col p-0 text-left transition-transform hover:-translate-y-px',
        app.status === 'disabled' && 'bg-card/70',
      )}
    >
      <CardContent className="flex w-full flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <IconTile tone={app.status === 'disabled' ? 'default' : 'ink'}>
            <AppTypeIcon type={app.type} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <Link
              to={`/applications/${app.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate font-semibold hover:underline"
            >
              {app.name}
            </Link>
            <Mono>{app.code}</Mono>
          </div>
          <div className="flex items-center gap-1">
            <HealthDot health={app.health} />
            <div onClick={(e) => e.stopPropagation()}>{menu}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold tabular-nums">{pricingLine(app)}</p>
          {app.trialDays > 0 && app.accessPolicy === 'subscription' ? (
            <Badge variant="info">{app.trialDays}-day trial</Badge>
          ) : null}
          {app.status !== 'active' ? (
            <Badge variant="outline">{app.status === 'disabled' ? 'Disabled' : 'Draft'}</Badge>
          ) : null}
        </div>
        <p className="text-muted mt-2 truncate text-xs">
          {APPLICATION_TYPE_LABEL[app.type]} · {INTEGRATION_MODE_LABEL[integrationModeOf(app)]}
        </p>
        <div className="mt-3 mb-5 flex flex-wrap gap-1.5">
          <Badge variant="outline">{ACCESS_POLICY_LABEL[app.accessPolicy]}</Badge>
          <Badge variant="outline">{app.tokenLifetimeMinutes} min token</Badge>
        </div>
        <SplitStats
          items={[
            { label: 'Subscriptions', value: subscriptions },
            { label: 'API clients', value: clients },
            { label: 'Webhooks', value: webhooks },
          ]}
        />
      </CardContent>
    </div>
  )
}
