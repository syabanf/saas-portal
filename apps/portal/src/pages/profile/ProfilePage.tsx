import { avatarColor, fmtAgo, fmtDate, fmtDateTime, initials } from '@scp/fixtures'
import type { Session, User } from '@scp/types'
import { USER_STATUS_LABEL, WORKSPACE_ROLE_LABEL } from '@scp/types'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  KeyValue,
  PageHeader,
  ToggleRow,
  type BadgeTone,
} from '@scp/ui'
import { ArrowLeftRight, Building2, LogOut, MonitorSmartphone, Pencil } from 'lucide-react'
import * as React from 'react'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { Mono, UserBadge } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'

const PREFS_KEY = 'scp.portal.prefs'

interface Prefs {
  compactTables: boolean
  emailFailedPayments: boolean
  demoHints: boolean
}
const DEFAULT_PREFS: Prefs = { compactTables: false, emailFailedPayments: true, demoHints: true }

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable; the toggles still work for this visit */
  }
}

type SessionState = 'active' | 'expired' | 'revoked'
const SESSION_STATE_LABEL: Record<SessionState, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
}
const SESSION_STATE_TONE: Record<SessionState, BadgeTone> = {
  active: 'success',
  revoked: 'muted',
  expired: 'default',
}
function sessionState(s: Session, now: number): SessionState {
  if (s.revoked) return 'revoked'
  return new Date(s.expiresAt).getTime() < now ? 'expired' : 'active'
}

/** Mounted only while the dialog is open, so every open starts from the saved profile. */
function EditProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { state, dispatch } = useScoped()
  const [name, setName] = React.useState(user.name)
  const [email, setEmail] = React.useState(user.email)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    if (state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === nextEmail)) {
      setEmailError('Another user already signs in with this email.')
      return
    }
    dispatch({
      type: 'users/upsert',
      user: { ...user, name: name.trim(), email: nextEmail, updatedAt: new Date().toISOString() },
    })
    onDone()
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Shown to the other members of your organizations.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Name" htmlFor="profile-name">
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={emailError ?? undefined}>
          <Input
            id="profile-email"
            type="email"
            value={email}
            error={emailError !== null}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError(null)
            }}
            required
          />
        </FormField>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  )
}

function SessionRow({
  session,
  now,
  current,
  onRevoke,
}: {
  session: Session
  now: number
  current: boolean
  onRevoke: () => void
}) {
  const st = sessionState(session, now)
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.userAgent}</p>
        <p className="text-muted text-xs">
          <Mono>{session.ip}</Mono> · Created {fmtDateTime(session.createdAt)} · Last seen{' '}
          {fmtAgo(session.lastSeenAt, now)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={SESSION_STATE_TONE[st]}>{SESSION_STATE_LABEL[st]}</Badge>
        {st === 'active' ? (
          current ? (
            <span className="text-muted text-xs">Current session</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={onRevoke}>
              Revoke
            </Button>
          )
        ) : null}
      </div>
    </li>
  )
}

export function ProfilePage() {
  const user = useCurrentUser()
  const { member, tenant, session, liveSession, switchTenant, logout } = useAuth()
  const { state, applicationsById, dispatch } = useScoped()
  const now = Date.now()
  const [editing, setEditing] = React.useState(false)
  const [revoking, setRevoking] = React.useState<Session | null>(null)
  const [prefs, setPrefs] = React.useState<Prefs>(readPrefs)

  const memberships = React.useMemo(
    () =>
      state.members
        .filter((m) => m.userId === user.id)
        .flatMap((m) => {
          const org = state.tenants.find((t) => t.id === m.tenantId)
          return org ? [{ member: m, org }] : []
        }),
    [state.members, state.tenants, user.id],
  )
  const sessions = React.useMemo(
    () =>
      state.sessions
        .filter((s) => s.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.sessions, user.id],
  )

  function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      writePrefs(next)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Your account, organizations and active sessions." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="self-start">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <Avatar initials={initials(user.name)} color={avatarColor(user.id)} size="xl" />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{user.name}</p>
              <p className="text-muted truncate text-sm">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {member && tenant ? (
                <Badge variant="ink">
                  {WORKSPACE_ROLE_LABEL[member.workspaceRole]} · {tenant.name}
                </Badge>
              ) : null}
              <UserBadge status={user.status} />
            </div>
            <p className="text-muted text-xs">Member since {fmtDate(user.createdAt)}</p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => setEditing(true)}>
                <Pencil /> Edit profile
              </Button>
              <Button variant="outline" onClick={() => void logout()}>
                <LogOut /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  { label: 'User id', value: <Mono>{user.id}</Mono> },
                  { label: 'Email', value: user.email },
                  { label: 'Status', value: USER_STATUS_LABEL[user.status] },
                  { label: 'Created', value: fmtDateTime(user.createdAt) },
                  { label: 'Updated', value: fmtDateTime(user.updatedAt) },
                  { label: 'Organization', value: tenant?.name ?? '—' },
                  {
                    label: 'Role',
                    value: member ? WORKSPACE_ROLE_LABEL[member.workspaceRole] : '—',
                  },
                  { label: 'Session id', value: <Mono>{session?.sessionId ?? '—'}</Mono> },
                  { label: 'Session expires', value: fmtDateTime(liveSession?.expiresAt) },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                Every workspace you belong to and the applications you may open.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.length === 0 ? (
                <EmptyState
                  icon={<Building2 />}
                  title="No organizations"
                  description="Accept an invitation to join a workspace."
                />
              ) : (
                <ul className="divide-border divide-y">
                  {memberships.map(({ member: m, org }) => {
                    const apps = m.applicationIds.flatMap((id) => {
                      const app = applicationsById.get(id)
                      return app ? [app] : []
                    })
                    const isCurrent = org.id === tenant?.id
                    return (
                      <li key={m.id} className="flex flex-wrap items-start gap-3 py-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="truncate text-sm font-semibold">
                            {org.name}
                            <span className="text-muted font-normal">
                              {' '}
                              · {WORKSPACE_ROLE_LABEL[m.workspaceRole]}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {apps.length === 0 ? (
                              <span className="text-muted text-xs">No application access</span>
                            ) : (
                              apps.map((app) => (
                                <Badge key={app.id} variant="default">
                                  {app.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        {isCurrent ? (
                          <Badge variant="success" dot>
                            Current
                          </Badge>
                        ) : m.status === 'active' ? (
                          <Button variant="ghost" size="sm" onClick={() => switchTenant(org.id)}>
                            <ArrowLeftRight /> Switch
                          </Button>
                        ) : (
                          <UserBadge status={m.status} />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Devices signed in as you. Revoking one signs that device out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={<MonitorSmartphone />}
                  title="No sessions"
                  description="Sessions appear here after you sign in."
                />
              ) : (
                <ul className="divide-border divide-y">
                  {sessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      now={now}
                      current={s.id === session?.sessionId}
                      onRevoke={() => setRevoking(s)}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Stored in this browser only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ToggleRow
                title="Compact tables"
                description="Tighter rows on list pages."
                checked={prefs.compactTables}
                onCheckedChange={(v) => setPref('compactTables', v)}
              />
              <ToggleRow
                title="Email me about failed payments"
                description="A message when a payment request expires or fails."
                checked={prefs.emailFailedPayments}
                onCheckedChange={(v) => setPref('emailFailedPayments', v)}
              />
              <ToggleRow
                title="Show demo hints"
                description="Callouts that explain the seeded data."
                checked={prefs.demoHints}
                onCheckedChange={(v) => setPref('demoHints', v)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent size="sm">
          <EditProfileForm user={user} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The device on {revoking?.ip ?? 'this address'} is signed out of the portal.
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
    </div>
  )
}
