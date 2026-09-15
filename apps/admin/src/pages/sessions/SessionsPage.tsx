import { avatarColor, fmtAgo, fmtDateTime, fmtNumber, initials } from '@scp/fixtures'
import type { Session } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  KeyValue,
  PageHeader,
  StatCard,
  cn,
  type Column,
} from '@scp/ui'
import { Ban, MonitorSmartphone, Search, ShieldOff, TimerOff } from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { Mono } from '../../components/badges'
import { PILL_COMBOBOX, PILL_INPUT, useFilterParams } from '../../lib/filters'
import { tenantOptions, userOptions, withAll } from '../../lib/options'
import { SESSION_STATE_LABEL, SESSION_STATE_TONE, sessionState } from '../../lib/sessions'
import { actorOf, useScoped } from '../../state/app-state'

const HOUR = 3_600_000
const REVOCATION_EVENTS = [
  'tenant.suspended',
  'subscription.suspended',
  'session.revoked',
  'access.revoked',
]

const STATUS_FILTERS = withAll(
  'All statuses',
  (['active', 'revoked', 'expired'] as const).map((value) => ({
    value,
    label: SESSION_STATE_LABEL[value],
  })),
)
const FILTER_KEYS = ['q', 'org', 'status'] as const

export function SessionsPage() {
  const { state, users, tenants, usersById, tenantsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const now = Date.now()
  const filters = useFilterParams(FILTER_KEYS)
  const { q: query, org, status } = filters.values
  const [revoking, setRevoking] = React.useState<Session | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [bulkUserId, setBulkUserId] = React.useState('')

  const stats = React.useMemo(() => {
    let active = 0
    let revoked = 0
    let expiring = 0
    for (const s of state.sessions) {
      const st = sessionState(s, now)
      if (st === 'revoked') revoked += 1
      if (st === 'active') {
        active += 1
        if (new Date(s.expiresAt).getTime() - now <= HOUR) expiring += 1
      }
    }
    return { active, revoked, expiring }
  }, [state.sessions, now])

  const rows = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return state.sessions.filter((s) => {
      if (org && s.tenantId !== org) return false
      if (status && sessionState(s, now) !== status) return false
      if (!needle) return true
      const u = usersById.get(s.userId)
      return [u?.name, u?.email, s.ip, s.userAgent].some((v) => v?.toLowerCase().includes(needle))
    })
  }, [state.sessions, usersById, query, org, status, now])

  const usersWithActive = React.useMemo(() => {
    const ids = new Set(
      state.sessions.filter((s) => sessionState(s, now) === 'active').map((s) => s.userId),
    )
    return users.filter((u) => ids.has(u.id))
  }, [state.sessions, users, now])
  const bulkTarget = usersWithActive.some((u) => u.id === bulkUserId)
    ? bulkUserId
    : (usersWithActive[0]?.id ?? '')
  const bulkCount = state.sessions.filter(
    (s) => s.userId === bulkTarget && sessionState(s, now) === 'active',
  ).length

  function revokeAllFor(userId: string) {
    for (const s of state.sessions) {
      if (s.userId === userId && sessionState(s, now) === 'active')
        dispatch({ type: 'sessions/revoke', id: s.id, actor: actorOf(user) })
    }
    setBulkOpen(false)
  }

  const columns: Column<Session>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (s) => {
        const u = usersById.get(s.userId)
        const name = u?.name ?? s.userId
        return (
          <div className="flex items-center gap-3">
            <Avatar initials={initials(name)} color={avatarColor(s.userId)} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-muted truncate text-xs">{u?.email ?? ''}</p>
            </div>
          </div>
        )
      },
      sortValue: (s) => usersById.get(s.userId)?.name ?? s.userId,
    },
    {
      key: 'tenant',
      header: 'Organization',
      cell: (s) => (
        <span className="text-sm">{tenantsById.get(s.tenantId)?.name ?? s.tenantId}</span>
      ),
      sortValue: (s) => tenantsById.get(s.tenantId)?.name ?? '',
    },
    {
      key: 'created',
      header: 'Created',
      cell: (s) => <span className="text-muted text-xs">{fmtDateTime(s.createdAt)}</span>,
      sortValue: (s) => s.createdAt,
    },
    {
      key: 'seen',
      header: 'Last seen',
      cell: (s) => <span className="text-muted text-xs">{fmtAgo(s.lastSeenAt, now)}</span>,
      sortValue: (s) => s.lastSeenAt,
    },
    {
      key: 'expires',
      header: 'Expires',
      cell: (s) => <span className="text-muted text-xs">{fmtDateTime(s.expiresAt)}</span>,
      sortValue: (s) => s.expiresAt,
    },
    { key: 'ip', header: 'IP', cell: (s) => <Mono>{s.ip}</Mono> },
    {
      key: 'ua',
      header: 'User agent',
      cell: (s) => <span className="text-muted text-xs">{s.userAgent}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => {
        const st = sessionState(s, now)
        return <Badge variant={SESSION_STATE_TONE[st]}>{SESSION_STATE_LABEL[st]}</Badge>
      },
      sortValue: (s) => sessionState(s, now),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sessions"
        description="Platform sessions issued by the identity service. Revocation propagates to every application on the next token exchange."
        actions={
          <Button
            variant="secondary"
            onClick={() => setBulkOpen(true)}
            disabled={usersWithActive.length === 0}
          >
            <ShieldOff />
            Revoke all for user
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Active sessions"
          value={fmtNumber(stats.active)}
          icon={<MonitorSmartphone />}
          tone="success"
        />
        <StatCard label="Revoked" value={fmtNumber(stats.revoked)} icon={<Ban />} tone="danger" />
        <StatCard
          label="Expiring within 1 h"
          value={fmtNumber(stats.expiring)}
          icon={<TimerOff />}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          leftIcon={<Search />}
          placeholder="Search user, email or IP"
          value={query}
          onChange={(e) => filters.set('q', e.target.value)}
          className={cn('w-full sm:w-72', PILL_INPUT)}
        />
        <Combobox
          value={org || 'all'}
          onChange={(v) => filters.set('org', v)}
          options={withAll('All organizations', tenantOptions(tenants))}
          searchPlaceholder="Search organizations…"
          className={cn('w-full sm:w-56', PILL_COMBOBOX)}
        />
        <Combobox
          value={status || 'all'}
          onChange={(v) => filters.set('status', v)}
          options={STATUS_FILTERS}
          searchPlaceholder="Search statuses…"
          className={cn('w-full sm:w-40', PILL_COMBOBOX)}
        />
        {filters.active ? <ClearFiltersButton onClick={filters.clear} /> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="min-w-0">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(s) => s.id}
            empty={
              filters.active
                ? {
                    icon: <MonitorSmartphone />,
                    title: 'No matches',
                    description: 'Try another user, IP, organization or status.',
                    action: <ClearFiltersButton onClick={filters.clear} />,
                  }
                : {
                    icon: <MonitorSmartphone />,
                    title: 'No sessions yet',
                    description: 'Sessions appear when users sign in to the SaaS Portal.',
                  }
            }
            rowActions={(s) => (
              <Button
                variant="outline"
                size="sm"
                disabled={s.revoked}
                onClick={() => setRevoking(s)}
              >
                Revoke
              </Button>
            )}
          />
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token lifetime policy</CardTitle>
              <CardDescription>
                App tokens stay short so subscription changes apply quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  { label: 'SaaS session', value: '8–24 h' },
                  { label: 'SaaS access token', value: '15–30 min' },
                  { label: 'App access token', value: '5–15 min' },
                  { label: 'Authorization code', value: '30–60 s, single-use' },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Emergency revocation</CardTitle>
              <CardDescription>
                Propagated through event bus and cache invalidation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {REVOCATION_EVENTS.map((ev) => (
                <span key={ev} className="bg-surface rounded-full px-3 py-1">
                  <Mono>{ev}</Mono>
                </span>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {usersById.get(revoking?.userId ?? '')?.name ?? 'The user'} is signed out of the SaaS
              Portal and every app token exchange fails from now on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revoking)
                  dispatch({ type: 'sessions/revoke', id: revoking.id, actor: actorOf(user) })
                setRevoking(null)
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Revoke all sessions for a user</DialogTitle>
            <DialogDescription>
              Only users with at least one active session are listed.
            </DialogDescription>
          </DialogHeader>
          <FormField label="User" htmlFor="bulk-user">
            <Combobox
              id="bulk-user"
              value={bulkTarget}
              onChange={setBulkUserId}
              options={userOptions(usersWithActive)}
              searchPlaceholder="Search users…"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={bulkCount === 0}
              onClick={() => revokeAllFor(bulkTarget)}
            >
              Revoke {bulkCount} {bulkCount === 1 ? 'session' : 'sessions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
