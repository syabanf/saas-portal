import { avatarColor, initials, newId, invitationFields } from '@scp/fixtures'
import type { TenantMember, WorkspaceRole } from '@scp/types'
import { WORKSPACE_ROLE_LABEL } from '@scp/types'
import {
  InvitationDialog,
  InvitationLink,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDelete,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  OptionCard,
  PageHeader,
  Select,
  type Column,
} from '@scp/ui'
import { KeyRound, Pencil, ShieldAlert, Trash2, UserMinus, UserPlus, X } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/auth'
import { pricingLine } from '../../components/AppCard'
import { UserBadge } from '../../components/badges'
import { useScoped, type MemberWithUser } from '../../state/app-state'

const ROLES: { value: WorkspaceRole; description: string }[] = [
  { value: 'member', description: 'Opens the applications listed below.' },
  { value: 'workspace_admin', description: 'Also manages users, subscriptions and billing.' },
]

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
      applications={applications
        .filter((a) => a.app.accessPolicy === 'free' || a.subscription)
        .map((a) => a.app)}
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
  const { applications, dispatch } = useScoped()
  const [draft, setDraft] = React.useState<TenantMember | null>(member)
  React.useEffect(() => setDraft(member), [member])
  const assignable = applications.filter(
    (a) => a.app.accessPolicy === 'free' || a.subscription !== null,
  )

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
              <DialogDescription>
                Application access decides which doors open. What they can do inside each
                application is up to that application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium">Application access</p>
                {assignable.length === 0 ? (
                  <EmptyState
                    className="py-6"
                    title="No applications to assign"
                    description="Subscribe to an application first. Free applications appear here automatically."
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
                            {pricingLine(a)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Workspace role</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <OptionCard
                      key={r.value}
                      selected={draft.workspaceRole === r.value}
                      title={WORKSPACE_ROLE_LABEL[r.value]}
                      description={r.description}
                      onSelect={() => setDraft({ ...draft, workspaceRole: r.value })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save access</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const [params] = useSearchParams()
  const requestedApp = params.get('app')
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
          title="Workspace admins only"
          description="Ask a workspace admin if you need someone added or given access to an application."
          action={
            <Button variant="outline" asChild>
              <Link to="/">Back to workspace</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  const columns: Column<MemberWithUser>[] = [
    {
      key: 'name',
      header: 'User',
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
      header: 'Workspace role',
      sortValue: (m) => m.workspaceRole,
      cell: (m) => WORKSPACE_ROLE_LABEL[m.workspaceRole],
    },
    {
      key: 'apps',
      header: 'Application access',
      cell: (m) => (
        <span className="flex flex-wrap gap-1">
          {m.applicationIds.length === 0 ? <span className="text-muted text-xs">None</span> : null}
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
      header: 'Status',
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
          Assign {applicationsById.get(requestedApp)?.name ?? 'application'} access using each
          person’s Edit access button, or invite someone new.
        </p>
      )}
      <PageHeader
        title="Users"
        description="Who belongs to your organization and which applications they may open."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite user
          </Button>
        }
      />
      {selected.size > 0 ? (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <p role="status" aria-live="polite" className="mr-auto text-sm font-semibold">
            {selected.size} users selected
          </p>
          <Select
            value={bulkApplicationId}
            onChange={(event) => setBulkApplicationId(event.target.value)}
            className="w-full sm:w-56"
          >
            <option value="">Choose application</option>
            {applications
              .filter((item) => item.app.accessPolicy === 'free' || item.subscription)
              .map((item) => (
                <option key={item.app.id} value={item.app.id}>
                  {item.app.name}
                </option>
              ))}
          </Select>
          <Button
            size="sm"
            disabled={!bulkApplicationId}
            onClick={() => updateSelectedAccess(true)}
          >
            <KeyRound /> Grant access
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkApplicationId}
            onClick={() => updateSelectedAccess(false)}
          >
            <UserMinus /> Remove access
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </Card>
      ) : null}
      <Card>
        <DataTable
          rows={members}
          columns={columns}
          rowKey={(m) => m.id}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          selectionLabel="Select user"
          onRowClick={setEditing}
          rowActions={(m) => (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit access"
                onClick={() => setEditing(m)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-accent"
                aria-label="Remove"
                disabled={m.userId === user?.id}
                onClick={() => setRemoving(m)}
              >
                <Trash2 />
              </Button>
            </>
          )}
          empty={{
            title: 'No users yet',
            description: 'Invite the first person to your organization.',
            action: <Button onClick={() => setInviteOpen(true)}>Invite user</Button>,
          }}
        />
      </Card>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <MemberAccessDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.user.name ?? 'user'}?`}
        description="They lose access to every application of this organization immediately."
        actionLabel="Remove"
        onConfirm={() => {
          if (removing) dispatch({ type: 'members/remove', id: removing.id })
          setRemoving(null)
        }}
      />
    </div>
  )
}
