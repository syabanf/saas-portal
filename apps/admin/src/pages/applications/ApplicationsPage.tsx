import type { AccessPolicyMode, Application, ApplicationType } from '@scp/types'
import { ACCESS_POLICY_LABEL, APPLICATION_TYPE_LABEL, AUTH_MODE_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDelete,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconTile,
  Input,
  Select,
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
import { AppTypeIcon, HealthDot, Mono } from '../../components/badges'
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
const POLICY_FILTERS: { value: AccessPolicyMode; label: string }[] = [
  { value: 'subscription', label: 'Subscription required' },
  { value: 'free', label: 'Free' },
  { value: 'manual', label: 'Manual' },
]

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
  const [query, setQuery] = React.useState('')
  const [tab, setTab] = React.useState<TypeTab>('all')
  const [policy, setPolicy] = React.useState<AccessPolicyMode | ''>('')
  const [removing, setRemoving] = React.useState<Application | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter(
      (a) =>
        (tab === 'all' || a.type === tab) &&
        (!policy || a.accessPolicy === policy) &&
        (!q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)),
    )
  }, [applications, query, tab, policy])

  const healthy = applications.filter((a) => a.health === 'healthy').length
  const sso = applications.filter((a) => a.authMode === 'sso').length

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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            leftIcon={<Search />}
            className="[&_input]:bg-surface w-full sm:w-64 [&_input]:rounded-full [&_input]:border-0"
          />
          <Button variant="secondary" onClick={() => navigate('/applications/new')}>
            <Plus /> Add product
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={applications.length}
          hint={`${applications.filter((a) => a.status === 'active').length} active`}
          icon={<AppWindow />}
          tone="ink"
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="Healthy"
          value={healthy}
          hint="Integration health"
          icon={<CheckCircle2 />}
          tone="success"
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="With issues"
          value={applications.length - healthy}
          hint="Webhook error or offline"
          icon={<AlertTriangle />}
          tone={applications.length - healthy > 0 ? 'danger' : 'default'}
          className="bg-surface-2 shadow-none"
        />
        <StatCard
          label="SSO enabled"
          value={sso}
          hint="Login through SaaS Platform"
          icon={<KeyRound />}
          tone="info"
          className="bg-surface-2 shadow-none"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Tabs
          variant="underline"
          value={tab}
          onValueChange={(v) => setTab(v as TypeTab)}
          className="min-w-0 flex-1"
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select
          tone="nested"
          value={policy}
          onChange={(e) => setPolicy(e.target.value as AccessPolicyMode | '')}
          aria-label="Filter by access policy"
          className="w-full sm:w-52 [&_select]:h-10 [&_select]:rounded-full"
        >
          <option value="">All access policies</option>
          {POLICY_FILTERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<AppWindow />}
          title={applications.length === 0 ? 'No products yet' : 'No products match'}
          description={
            applications.length === 0
              ? 'Run the setup wizard to register the first product and its production client.'
              : 'Try another search, type or access policy.'
          }
          action={
            <Button variant="secondary" onClick={() => navigate('/applications/new')}>
              <Plus /> Add product
            </Button>
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
          {APPLICATION_TYPE_LABEL[app.type]} · {AUTH_MODE_LABEL[app.authMode]}
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
