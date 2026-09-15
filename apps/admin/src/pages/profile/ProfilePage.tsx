import { avatarColor, fmtAgo, fmtDate, fmtDateTime, initials } from '@scp/fixtures'
import type { Session, User } from '@scp/types'
import { USER_STATUS_LABEL } from '@scp/types'
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
  SettingRow,
  ToggleRow,
} from '@scp/ui'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Building2,
  ChevronRight,
  FileText,
  LogOut,
  MonitorSmartphone,
  Pencil,
  Receipt,
  ScrollText,
  Webhook,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { Mono, UserBadge } from '../../components/badges'
import { SESSION_STATE_LABEL, SESSION_STATE_TONE, sessionState } from '../../lib/sessions'
import { actorOf, useScoped } from '../../state/app-state'

const PREFS_KEY = 'scp.admin.prefs'

interface Prefs {
  compactTables: boolean
  emailFailedWebhooks: boolean
  demoHints: boolean
}
const DEFAULT_PREFS: Prefs = { compactTables: false, emailFailedWebhooks: true, demoHints: true }

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

const ACCESS_AREAS: { to: string; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    to: '/organizations',
    title: 'Organizations',
    subtitle: 'Tenants, members and status',
    icon: Building2,
  },
  {
    to: '/applications',
    title: 'Products',
    subtitle: 'Applications, pricing and access policy',
    icon: AppWindow,
  },
  {
    to: '/subscriptions',
    title: 'Subscriptions',
    subtitle: 'Plans, periods and lifecycle',
    icon: Receipt,
  },
  { to: '/billing', title: 'Billing', subtitle: 'Invoices and payment records', icon: FileText },
  {
    to: '/webhooks',
    title: 'Integrations',
    subtitle: 'Webhooks, API clients and SDK',
    icon: Webhook,
  },
  { to: '/audit', title: 'Audit', subtitle: 'Every change with its actor', icon: ScrollText },
]

/** Mounted only while the dialog is open, so every open starts from the saved profile. */
function EditProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { users, dispatch } = useScoped()
  const [name, setName] = React.useState(user.name)
  const [email, setEmail] = React.useState(user.email)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    if (users.some((u) => u.id !== user.id && u.email.toLowerCase() === nextEmail)) {
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
        <DialogDescription>Your name appears as the actor on audit entries.</DialogDescription>
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
  onRevoke,
}: {
  session: Session
  now: number
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
          <Button variant="ghost" size="sm" onClick={onRevoke}>
            Revoke
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function ProfilePage() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const { state, dispatch } = useScoped()
  const navigate = useNavigate()
  const now = Date.now()
  const [editing, setEditing] = React.useState(false)
  const [revoking, setRevoking] = React.useState<Session | null>(null)
  const [prefs, setPrefs] = React.useState<Prefs>(readPrefs)

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
      <PageHeader title="Profile" description="Your account, access and active sessions." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="self-start">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <Avatar initials={initials(user.name)} color={avatarColor(user.id)} size="xl" />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{user.name}</p>
              <p className="text-muted truncate text-sm">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="ink">Platform admin</Badge>
              <UserBadge status={user.status} />
            </div>
            <p className="text-muted text-xs">Member since {fmtDate(user.createdAt)}</p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => setEditing(true)}>
                <Pencil /> Edit profile
              </Button>
              <Button variant="outline" onClick={logout}>
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
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access</CardTitle>
              <CardDescription>A platform admin manages every organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ACCESS_AREAS.map((area) => (
                <SettingRow
                  key={area.to}
                  icon={<area.icon />}
                  title={area.title}
                  subtitle={area.subtitle}
                  trailing={<ChevronRight className="text-muted size-4" />}
                  onClick={() => navigate(area.to)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Sessions issued to this account. Revoking one signs that device out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={<MonitorSmartphone />}
                  title="No sessions"
                  description="Sessions appear here after a sign-in through the identity service."
                />
              ) : (
                <ul className="divide-border divide-y">
                  {sessions.map((s) => (
                    <SessionRow key={s.id} session={s} now={now} onRevoke={() => setRevoking(s)} />
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
                title="Email me about failed webhooks"
                description="One digest per day when a delivery keeps failing."
                checked={prefs.emailFailedWebhooks}
                onCheckedChange={(v) => setPref('emailFailedWebhooks', v)}
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
              The device on {revoking?.ip ?? 'this address'} is signed out and every app token
              exchange from it fails from now on.
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
