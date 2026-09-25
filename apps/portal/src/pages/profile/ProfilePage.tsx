import { avatarColor, initials } from '@scp/fixtures'
import { useFormat, useT } from '@scp/i18n'
import type { Session, User } from '@scp/types'
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
import { LanguageCombobox } from '../../components/LanguageCombobox'
import { actorOf, useScoped } from '../../state/app-state'
import { usePrefs } from '../../state/prefs'

type SessionState = 'active' | 'expired' | 'revoked'
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
  const t = useT()
  const { state, dispatch } = useScoped()
  const [name, setName] = React.useState(user.name)
  const [email, setEmail] = React.useState(user.email)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const nextEmail = email.trim().toLowerCase()
    if (state.users.some((u) => u.id !== user.id && u.email.toLowerCase() === nextEmail)) {
      setEmailError(t('profile.emailTaken'))
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
        <DialogTitle>{t('profile.edit')}</DialogTitle>
        <DialogDescription>{t('profile.editDescription')}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4">
        <FormField label={t('common.name')} htmlFor="profile-name">
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>
        <FormField
          label={t('common.email')}
          htmlFor="profile-email"
          error={emailError ?? undefined}
        >
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
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.saveChanges')}</Button>
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
  const t = useT()
  const { formatDateTime, formatAgo } = useFormat()
  const st = sessionState(session, now)
  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{session.userAgent}</p>
        <p className="text-muted text-xs">
          <Mono>{session.ip}</Mono> ·{' '}
          {t('profile.sessionMeta', {
            created: formatDateTime(session.createdAt),
            seen: formatAgo(session.lastSeenAt, now),
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={SESSION_STATE_TONE[st]}>{t(`status.session.${st}`)}</Badge>
        {st === 'active' ? (
          current ? (
            <span className="text-muted text-xs">{t('profile.currentSession')}</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={onRevoke}>
              {t('profile.revoke')}
            </Button>
          )
        ) : null}
      </div>
    </li>
  )
}

export function ProfilePage() {
  const t = useT()
  const { formatDate, formatDateTime } = useFormat()
  const user = useCurrentUser()
  const { member, tenant, session, liveSession, switchTenant, logout } = useAuth()
  const { state, applicationsById, dispatch } = useScoped()
  const { prefs, setPref } = usePrefs()
  const now = Date.now()
  const [editing, setEditing] = React.useState(false)
  const [revoking, setRevoking] = React.useState<Session | null>(null)

  const memberships = React.useMemo(
    () =>
      state.members
        .filter((m) => m.userId === user.id)
        .flatMap((m) => {
          const org = state.tenants.find((item) => item.id === m.tenantId)
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

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.profile')} description={t('profile.description')} />

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
                  {t(`role.${member.workspaceRole}`)} · {tenant.name}
                </Badge>
              ) : null}
              <UserBadge status={user.status} />
            </div>
            <p className="text-muted text-xs">
              {t('profile.memberSince', { date: formatDate(user.createdAt) })}
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => setEditing(true)}>
                <Pencil /> {t('profile.edit')}
              </Button>
              <Button variant="outline" onClick={() => void logout()}>
                <LogOut /> {t('common.signOut')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.account')}</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  { label: t('profile.userId'), value: <Mono>{user.id}</Mono> },
                  { label: t('common.email'), value: user.email },
                  { label: t('common.status'), value: t(`status.user.${user.status}`) },
                  { label: t('common.created'), value: formatDateTime(user.createdAt) },
                  { label: t('profile.updated'), value: formatDateTime(user.updatedAt) },
                  { label: t('nav.organization'), value: tenant?.name ?? '—' },
                  {
                    label: t('common.role'),
                    value: member ? t(`role.${member.workspaceRole}`) : '—',
                  },
                  {
                    label: t('profile.sessionId'),
                    value: <Mono>{session?.sessionId ?? '—'}</Mono>,
                  },
                  {
                    label: t('profile.sessionExpires'),
                    value: formatDateTime(liveSession?.expiresAt),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('profile.organizations')}</CardTitle>
              <CardDescription>{t('profile.organizationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.length === 0 ? (
                <EmptyState
                  icon={<Building2 />}
                  title={t('profile.noOrganizations')}
                  description={t('profile.noOrganizationsDescription')}
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
                              · {t(`role.${m.workspaceRole}`)}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {apps.length === 0 ? (
                              <span className="text-muted text-xs">
                                {t('profile.noApplicationAccess')}
                              </span>
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
                            {t('common.current')}
                          </Badge>
                        ) : m.status === 'active' ? (
                          <Button variant="ghost" size="sm" onClick={() => switchTenant(org.id)}>
                            <ArrowLeftRight /> {t('profile.switch')}
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
              <CardTitle>{t('profile.sessions')}</CardTitle>
              <CardDescription>{t('profile.sessionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={<MonitorSmartphone />}
                  title={t('profile.noSessions')}
                  description={t('profile.noSessionsDescription')}
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
              <CardTitle>{t('profile.preferences')}</CardTitle>
              <CardDescription>{t('profile.preferencesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <FormField label={t('common.language')} htmlFor="profile-language">
                <LanguageCombobox id="profile-language" />
              </FormField>
              <ToggleRow
                title={t('profile.compactTables')}
                description={t('profile.compactTablesDescription')}
                checked={prefs.compactTables}
                onCheckedChange={(v) => setPref('compactTables', v)}
              />
              <ToggleRow
                title={t('profile.emailFailed')}
                description={t('profile.emailFailedDescription')}
                checked={prefs.emailFailedPayments}
                onCheckedChange={(v) => setPref('emailFailedPayments', v)}
              />
              <ToggleRow
                title={t('profile.demoHints')}
                description={t('profile.demoHintsDescription')}
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
            <AlertDialogTitle>{t('profile.revokeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.revokeDescription', { ip: revoking?.ip ?? t('profile.thisAddress') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revoking)
                  dispatch({ type: 'sessions/revoke', id: revoking.id, actor: actorOf(user) })
                setRevoking(null)
              }}
            >
              {t('profile.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
