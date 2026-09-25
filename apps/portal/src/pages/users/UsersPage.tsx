import { avatarColor, fmtNumber, initials, newId, invitationFields } from '@scp/fixtures'
import { useT, type DictKey } from '@scp/i18n'
import type { TenantMember, UserStatus, WorkspaceRole } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  InvitationDialog,
  InvitationLink,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  OptionCard,
  PageHeader,
  StatCard,
  type Column,
} from '@scp/ui'
import {
  KeyRound,
  Mail,
  Pencil,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/auth'
import { pricingLine } from '../../components/AppCard'
import { UserBadge } from '../../components/badges'
import {
  ClearFiltersButton,
  FilterCombobox,
  enumOptions,
  useApplicationOptions,
  useFilterParams,
  useNoMatches,
} from '../../components/filters'
import { useScoped, type MemberWithUser, type PortalApplication } from '../../state/app-state'

/** Applications a member can be given: free ones, or ones the organization subscribes to. */
function assignableApplications(applications: PortalApplication[]): PortalApplication[] {
  return applications.filter((a) => a.app.accessPolicy === 'free' || a.subscription !== null)
}

const ROLES: { value: WorkspaceRole; description: DictKey }[] = [
  { value: 'member', description: 'users.role.memberDescription' },
  { value: 'workspace_admin', description: 'users.role.adminDescription' },
]
const ROLE_VALUES: WorkspaceRole[] = ['workspace_admin', 'member']
const USER_STATUSES: UserStatus[] = ['active', 'invited', 'disabled']

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, tenantId, members, applications, dispatch } = useScoped()
  return (
    <InvitationDialog
      open={open}
      onOpenChange={onOpenChange}
      people={state.users}
      memberUserIds={members.map((m) => m.userId)}
      applications={assignableApplications(applications).map((a) => a.app)}
      onInvite={(draft) => {
        const existing = state.users.find((u) => u.email.toLowerCase() === draft.email)
        const userId = existing?.id ?? newId('usr')
        const at = new Date().toISOString()
        if (!existing)
          dispatch({
            type: 'users/upsert',
            user: {
              id: userId,
              name: draft.name,
              email: draft.email,
              status: 'invited',
              platformAdmin: false,
              createdAt: at,
              updatedAt: at,
            },
          })
        dispatch({
          type: 'members/upsert',
          member: {
            id: newId('mem'),
            tenantId,
            userId,
            status: 'invited',
            workspaceRole: draft.workspaceRole,
            applicationIds: draft.applicationIds,
            ...invitationFields(),
          },
        })
        onOpenChange(false)
      }}
    />
  )
}

/** Blueprint §39: which applications a user may enter, and the workspace role. Roles inside an app stay with the app. */
function MemberAccessDialog({
  member,
  onOpenChange,
}: {
  member: MemberWithUser | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const { applications, dispatch } = useScoped()
  const [draft, setDraft] = React.useState<TenantMember | null>(member)
  React.useEffect(() => setDraft(member), [member])
  const assignable = assignableApplications(applications)

  function toggle(id: string, on: boolean) {
    setDraft((d) =>
      d
        ? {
            ...d,
            applicationIds: on
              ? Array.from(new Set([...d.applicationIds, id]))
              : d.applicationIds.filter((x) => x !== id),
          }
        : d,
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (draft) dispatch({ type: 'members/upsert', member: draft })
    onOpenChange(false)
  }

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {member && draft ? (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{member.user.name}</DialogTitle>
              <DialogDescription>{t('users.accessDialogDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">{t('users.applicationAccess')}</p>
                {assignable.length === 0 ? (
                  <EmptyState
                    className="py-6"
                    title={t('users.noneToAssign')}
                    description={t('users.noneToAssignDescription')}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {assignable.map((a) => (
                      <label
                        key={a.app.id}
                        className="bg-surface flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
                      >
                        <Checkbox
                          checked={draft.applicationIds.includes(a.app.id)}
                          onChange={(e) => toggle(a.app.id, e.target.checked)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{a.app.name}</span>
                          <span className="text-muted block truncate text-xs">
                            {pricingLine(t, a)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t('users.workspaceRole')}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <OptionCard
                      key={r.value}
                      selected={draft.workspaceRole === r.value}
                      title={t(`role.${r.value}`)}
                      description={t(r.description)}
                      onSelect={() => setDraft({ ...draft, workspaceRole: r.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('users.saveAccess')}</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const t = useT()
  const noMatches = useNoMatches()
  const applicationOptions = useApplicationOptions()
  const [params] = useSearchParams()
  const requestedApp = params.get('app')
  const { values, set, clear, active } = useFilterParams(['q', 'role', 'status', 'access'])
  const { member: me, user } = useAuth()
  const { members, applications, applicationsById, dispatch } = useScoped()
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MemberWithUser | null>(null)
  const [removing, setRemoving] = React.useState<MemberWithUser | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkApplicationId, setBulkApplicationId] = React.useState(requestedApp ?? '')

  React.useEffect(() => {
    setSelected(
      (current) => new Set([...current].filter((id) => members.some((member) => member.id === id))),
    )
  }, [members])

  const assignable = assignableApplications(applications)
  const q = values.q.trim().toLowerCase()
  const visible = members.filter(
    (m) =>
      (!q || m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)) &&
      (!values.role || m.workspaceRole === values.role) &&
      (!values.status || m.status === values.status) &&
      (!values.access || m.applicationIds.includes(values.access)),
  )
  const countWhere = (test: (m: MemberWithUser) => boolean) =>
    fmtNumber(members.filter(test).length)

  function updateSelectedAccess(grant: boolean) {
    if (!bulkApplicationId) return
    for (const member of members.filter((item) => selected.has(item.id))) {
      dispatch({
        type: 'members/upsert',
        member: {
          ...member,
          applicationIds: grant
            ? Array.from(new Set([...member.applicationIds, bulkApplicationId]))
            : member.applicationIds.filter((id) => id !== bulkApplicationId),
        },
      })
    }
    setSelected(new Set())
  }

  if (me?.workspaceRole !== 'workspace_admin') {
    return (
      <Card>
        <EmptyState
          icon={<ShieldAlert />}
          title={t('users.adminsOnly')}
          description={t('users.adminsOnlyDescription')}
          action={
            <Button variant="outline" asChild>
              <Link to="/">{t('common.backToWorkspace')}</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  const columns: Column<MemberWithUser>[] = [
    {
      key: 'name',
      header: t('users.column.user'),
      sortValue: (m) => m.user.name,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Avatar initials={initials(m.user.name)} color={avatarColor(m.user.id)} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{m.user.name}</span>
            <span className="text-muted block truncate text-xs">{m.user.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: t('users.column.role'),
      sortValue: (m) => m.workspaceRole,
      cell: (m) => t(`role.${m.workspaceRole}`),
    },
    {
      key: 'apps',
      header: t('users.column.access'),
      cell: (m) => (
        <span className="flex flex-wrap gap-1">
          {m.applicationIds.length === 0 ? (
            <span className="text-muted text-xs">{t('common.none')}</span>
          ) : null}
          {m.applicationIds.map((id) => (
            <Badge key={id} variant="default">
              {applicationsById.get(id)?.name ?? id}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortValue: (m) => m.status,
      cell: (m) => (
        <>
          <UserBadge status={m.status} />
          {m.status === 'invited' && (
            <InvitationLink
              token={m.invitationToken}
              expiresAt={m.invitationExpiresAt}
              portalUrl={window.location.origin}
              onRenew={() =>
                dispatch({ type: 'members/upsert', member: { ...m, ...invitationFields() } })
              }
            />
          )}
        </>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {requestedApp && (
        <p role="status" className="bg-surface-2 rounded-2xl p-4">
          {t('users.assignHint', {
            app: applicationsById.get(requestedApp)?.name ?? t('common.application'),
          })}
        </p>
      )}
      <PageHeader
        title={t('nav.users')}
        description={t('users.description')}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> {t('users.inviteUser')}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('users.members')}
          value={fmtNumber(members.length)}
          hint={t('users.membersHint')}
          icon={<Users />}
          tone="ink"
        />
        <StatCard
          label={t('users.admins')}
          value={countWhere((m) => m.workspaceRole === 'workspace_admin')}
          hint={t('users.adminsHint')}
          icon={<ShieldCheck />}
          tone="info"
        />
        <StatCard
          label={t('users.invited')}
          value={countWhere((m) => m.status === 'invited')}
          hint={t('users.invitedHint')}
          icon={<Mail />}
          tone="warning"
        />
        <StatCard
          label={t('users.noAccess')}
          value={countWhere((m) => m.applicationIds.length === 0)}
          hint={t('users.noAccessHint')}
          icon={<UserX />}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          leftIcon={<Search />}
          value={values.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          aria-label={t('users.searchUsers')}
          className="[&_input]:shadow-card w-full sm:w-64 [&_input]:rounded-full [&_input]:border-0"
        />
        <FilterCombobox
          value={values.role}
          onChange={(v) => set('role', v)}
          options={enumOptions(ROLE_VALUES, (r) => t(`role.${r}`))}
          allLabel={t('users.allRoles')}
          searchPlaceholder={t('users.searchRoles')}
        />
        <FilterCombobox
          value={values.status}
          onChange={(v) => set('status', v)}
          options={enumOptions(USER_STATUSES, (s) => t(`status.user.${s}`))}
          allLabel={t('common.allStatuses')}
          searchPlaceholder={t('common.searchStatuses')}
        />
        <FilterCombobox
          value={values.access}
          onChange={(v) => set('access', v)}
          options={applicationOptions(assignable)}
          allLabel={t('common.allApplications')}
          searchPlaceholder={t('common.searchApplications')}
        />
        {active ? <ClearFiltersButton onClick={clear} /> : null}
      </div>
      {selected.size > 0 ? (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <p role="status" aria-live="polite" className="mr-auto text-sm font-semibold">
            {selected.size === 1
              ? t('users.selectedOne')
              : t('users.selectedMany', { count: selected.size })}
          </p>
          <Combobox
            tone="nested"
            value={bulkApplicationId}
            onChange={setBulkApplicationId}
            options={applicationOptions(assignable)}
            placeholder={t('users.chooseApplication')}
            searchPlaceholder={t('common.searchApplications')}
            emptyText={t('common.noMatches')}
            className="w-full sm:w-56"
          />
          <Button
            size="sm"
            disabled={!bulkApplicationId}
            onClick={() => updateSelectedAccess(true)}
          >
            <KeyRound /> {t('users.grantAccess')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkApplicationId}
            onClick={() => updateSelectedAccess(false)}
          >
            <UserMinus /> {t('users.removeAccess')}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t('users.clearSelection')}
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </Card>
      ) : null}
      <Card>
        <DataTable
          rows={visible}
          columns={columns}
          rowKey={(m) => m.id}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          selectionLabel={t('users.selectUser')}
          onRowClick={setEditing}
          rowActions={(m) => (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('users.editAccess')}
                onClick={() => setEditing(m)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-accent"
                aria-label={t('users.remove')}
                disabled={m.userId === user?.id}
                onClick={() => setRemoving(m)}
              >
                <Trash2 />
              </Button>
            </>
          )}
          empty={
            active
              ? noMatches(clear)
              : {
                  title: t('users.empty'),
                  description: t('users.emptyDescription'),
                  action: (
                    <Button onClick={() => setInviteOpen(true)}>{t('users.inviteUser')}</Button>
                  ),
                }
          }
        />
      </Card>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <MemberAccessDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('users.removeTitle', { name: removing?.user.name ?? t('users.column.user') })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('users.removeDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) dispatch({ type: 'members/remove', id: removing.id })
                setRemoving(null)
              }}
            >
              {t('users.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
