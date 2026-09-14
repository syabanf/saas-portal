import { fmtAgo, fmtDate, fmtNumber } from '@scp/fixtures'
import type { ApiClient, Environment } from '@scp/types'
import { ENVIRONMENTS, ENVIRONMENT_LABEL } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconTile,
  Input,
  PageHeader,
  SettingRow,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from '@scp/ui'
import {
  AppWindow,
  ArrowLeftRight,
  Ban,
  KeyRound,
  KeySquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  Webhook,
} from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { EnvBadge, Mono } from '../../components/badges'
import { ApiClientDialog, type ApiClientDialogMode } from '../../components/master/ApiClientDialog'
import { actorOf, useScoped } from '../../state/app-state'

type EnvFilter = 'all' | Environment
const DAY = 86_400_000

const ENV_NOTE: Record<Environment, string> = {
  development: 'Local builds and development branches. Secrets may be shared inside the team.',
  production:
    'Live traffic. Separate credentials, redirect URIs and webhook URLs from every other environment.',
  staging: 'Pre-release verification against production-like data.',
}

const USAGE: { icon: React.ReactNode; title: string; subtitle: string }[] = [
  {
    icon: <ArrowLeftRight />,
    title: 'Authorization code exchange',
    subtitle: 'The application swaps a single-use code for a short-lived app token.',
  },
  {
    icon: <KeyRound />,
    title: 'Client credentials grant',
    subtitle: 'Backend services authenticate with client id and secret, no user involved.',
  },
  {
    icon: <Webhook />,
    title: 'Webhook signature',
    subtitle: 'Deliveries are signed with the endpoint secret so receivers can verify them.',
  },
]

export function ApiClientsPage() {
  const { apiClients, applicationsById, clientsByApplication, dispatch } = useScoped()
  const user = useCurrentUser()
  const now = Date.now()

  const [env, setEnv] = React.useState<EnvFilter>('all')
  const [query, setQuery] = React.useState('')
  const [dialog, setDialog] = React.useState<ApiClientDialogMode | null>(null)
  const [revoking, setRevoking] = React.useState<ApiClient | null>(null)
  const [deleting, setDeleting] = React.useState<ApiClient | null>(null)

  const stats = React.useMemo(
    () => ({
      active: apiClients.filter((c) => c.status === 'active').length,
      revoked: apiClients.filter((c) => c.status === 'revoked').length,
      rotated: apiClients.filter(
        (c) => c.rotatedAt && now - new Date(c.rotatedAt).getTime() <= 30 * DAY,
      ).length,
      applications: clientsByApplication.size,
    }),
    [apiClients, clientsByApplication, now],
  )

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return apiClients.filter((c) => {
      if (env !== 'all' && c.environment !== env) return false
      if (!q) return true
      const appName = applicationsById.get(c.applicationId)?.name ?? ''
      return (
        c.name.toLowerCase().includes(q) ||
        c.clientId.toLowerCase().includes(q) ||
        appName.toLowerCase().includes(q)
      )
    })
  }, [apiClients, applicationsById, env, query])

  const columns: Column<ApiClient>[] = [
    {
      key: 'name',
      header: 'Client',
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{c.name}</p>
          <p className="text-muted truncate text-xs">
            {applicationsById.get(c.applicationId)?.name ?? c.applicationId}
          </p>
        </div>
      ),
      sortValue: (c) => c.name,
    },
    {
      key: 'env',
      header: 'Environment',
      cell: (c) => <EnvBadge environment={c.environment} />,
      sortValue: (c) => c.environment,
    },
    { key: 'clientId', header: 'Client id', cell: (c) => <Mono>{c.clientId}</Mono> },
    { key: 'secret', header: 'Secret', cell: (c) => <Mono>{`••••••••${c.secretHint}`}</Mono> },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => (
        <Badge variant={c.status === 'active' ? 'success' : 'muted'}>
          {c.status === 'active' ? 'Active' : 'Revoked'}
        </Badge>
      ),
      sortValue: (c) => c.status,
    },
    {
      key: 'created',
      header: 'Created',
      cell: (c) => <span className="text-muted text-xs">{fmtDate(c.createdAt)}</span>,
      sortValue: (c) => c.createdAt,
    },
    {
      key: 'rotated',
      header: 'Rotated',
      cell: (c) => (
        <span className="text-muted text-xs">
          {c.rotatedAt ? fmtAgo(c.rotatedAt, now) : 'Never'}
        </span>
      ),
      sortValue: (c) => c.rotatedAt ?? '',
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="API clients"
        description="Machine-to-machine credentials per application and environment. Secrets are hashed and shown once."
        actions={
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus />
            New client
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Active clients"
          value={fmtNumber(stats.active)}
          icon={<KeyRound />}
          tone="success"
        />
        <StatCard
          label="Revoked"
          value={fmtNumber(stats.revoked)}
          icon={<ShieldOff />}
          tone="danger"
        />
        <StatCard
          label="Rotated"
          value={fmtNumber(stats.rotated)}
          hint="Last 30 days"
          icon={<RefreshCw />}
          tone="info"
        />
        <StatCard
          label="Applications"
          value={fmtNumber(stats.applications)}
          hint="With credentials"
          icon={<AppWindow />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={env}
          onValueChange={(v) => setEnv(v as EnvFilter)}
          className="max-w-full min-w-0"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {ENVIRONMENTS.map((e) => (
              <TabsTrigger key={e} value={e}>
                {ENVIRONMENT_LABEL[e]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          leftIcon={<Search />}
          placeholder="Search clients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="[&_input]:bg-card [&_input]:shadow-card w-full sm:w-72 [&_input]:h-11 [&_input]:rounded-full [&_input]:border-0"
        />
      </div>

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          empty={{
            icon: <KeySquare />,
            title: 'No clients match',
            description:
              'Create a client for the application and environment you want to integrate.',
            action: (
              <Button size="sm" onClick={() => setDialog({ kind: 'create' })}>
                New client
              </Button>
            ),
          }}
          rowActions={(c) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Client actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={c.status === 'revoked'}
                  onSelect={() => setDialog({ kind: 'rotate', client: c })}
                >
                  <RefreshCw />
                  Rotate secret
                </DropdownMenuItem>
                <DropdownMenuItem disabled={c.status === 'revoked'} onSelect={() => setRevoking(c)}>
                  <Ban />
                  Revoke
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={() => setDeleting(c)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How clients are used</CardTitle>
            <CardDescription>
              Each credential covers one application in one environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {USAGE.map((row) => (
              <SettingRow
                key={row.title}
                icon={row.icon}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
            <p className="text-muted pt-1 text-xs">
              Tokens are issued and verified by the backend. This console only manages the
              credentials.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environments</CardTitle>
            <CardDescription>
              Every application keeps separate client ids, secrets, redirect URIs and webhook URLs
              per environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ENVIRONMENTS.map((e) => {
              const count = apiClients.filter(
                (c) => c.environment === e && c.status === 'active',
              ).length
              return (
                <div key={e} className="bg-surface-2 flex items-center gap-3 rounded-2xl p-3">
                  <IconTile size="sm" tone={e === 'production' ? 'ink' : 'default'}>
                    <KeyRound />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{ENVIRONMENT_LABEL[e]}</span>
                      <Badge variant="muted">{fmtNumber(count)} active</Badge>
                    </div>
                    <p className="text-muted text-xs">{ENV_NOTE[e]}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <ApiClientDialog mode={dialog} onOpenChange={(open) => !open && setDialog(null)} />

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Token requests with this client id stop working immediately. The record stays for
              audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revoking)
                  dispatch({ type: 'apiClients/revoke', id: revoking.id, actor: actorOf(user) })
                setRevoking(null)
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'client'}?`}
        description="The client id disappears from this list. Revoke instead if you need to keep the audit trail visible here."
        onConfirm={() => {
          if (deleting) dispatch({ type: 'apiClients/remove', id: deleting.id })
          setDeleting(null)
        }}
      />
    </div>
  )
}
