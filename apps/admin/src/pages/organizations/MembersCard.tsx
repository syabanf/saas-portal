import { avatarColor, initials, invitationFields } from '@scp/fixtures'
import type { Tenant, TenantMember, WorkspaceRole } from '@scp/types'
import { WORKSPACE_ROLE_LABEL } from '@scp/types'
import {
  InvitationLink,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  ConfirmDelete,
  EmptyState,
  Input,
} from '@scp/ui'
import { Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react'
import * as React from 'react'
import { ClearFiltersButton } from '../../components/ClearFiltersButton'
import { UserBadge } from '../../components/badges'
import { MemberDialog } from '../../components/master/MemberDialog'
import { labelOptions, withAll } from '../../lib/options'
import { useScoped } from '../../state/app-state'
import { InviteUserDialog } from './InviteUserDialog'

const ROLE_FILTERS = withAll(
  'All roles',
  labelOptions(['workspace_admin', 'member'] satisfies WorkspaceRole[], WORKSPACE_ROLE_LABEL),
)
const FILTERABLE_FROM = 6

export function MembersCard({ tenant }: { tenant: Tenant }) {
  const { membersByTenant, usersById, applicationsById, dispatch } = useScoped()
  const [editing, setEditing] = React.useState<TenantMember | null>(null)
  const [removing, setRemoving] = React.useState<TenantMember | null>(null)
  const [inviting, setInviting] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [role, setRole] = React.useState('')
  const members = membersByTenant.get(tenant.id) ?? []
  const filterable = members.length >= FILTERABLE_FROM
  const filtersActive = filterable && (query.trim() !== '' || role !== '')

  const rows = React.useMemo(() => {
    if (!filtersActive) return members
    const needle = query.trim().toLowerCase()
    return members.filter((m) => {
      if (role && m.workspaceRole !== role) return false
      if (!needle) return true
      const person = usersById.get(m.userId)
      return [person?.name, person?.email].some((v) => v?.toLowerCase().includes(needle))
    })
  }, [members, usersById, filtersActive, query, role])

  function clearFilters() {
    setQuery('')
    setRole('')
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          Members <Badge variant="muted">{members.length}</Badge>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setInviting(true)}>
          <UserPlus /> Invite user
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {filterable ? (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <Input
              tone="nested"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members…"
              leftIcon={<Search />}
              className="w-full sm:w-60 [&_input]:h-10 [&_input]:rounded-full"
            />
            <Combobox
              tone="ghost"
              value={role || 'all'}
              onChange={(v) => setRole(v === 'all' ? '' : v)}
              options={ROLE_FILTERS}
              searchPlaceholder="Search roles…"
            />
            {filtersActive ? <ClearFiltersButton onClick={clearFilters} /> : null}
          </div>
        ) : null}
        {members.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No members yet"
            description="Invite the first user and choose which applications they can open."
            action={
              <Button size="sm" onClick={() => setInviting(true)}>
                <UserPlus /> Invite user
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No matches"
            description="Try another name, email or role."
            action={<ClearFiltersButton onClick={clearFilters} />}
          />
        ) : (
          rows.map((m) => {
            const person = usersById.get(m.userId)
            const name = person?.name ?? m.userId
            return (
              <div key={m.id} className="group bg-surface-2 flex items-start gap-3 rounded-2xl p-3">
                <Avatar initials={initials(name)} color={avatarColor(m.userId)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <UserBadge status={m.status} />
                  </div>
                  <p className="text-muted truncate text-xs">
                    {person?.email} · {WORKSPACE_ROLE_LABEL[m.workspaceRole]}
                  </p>
                  {m.status === 'invited' && (
                    <InvitationLink
                      token={m.invitationToken}
                      expiresAt={m.invitationExpiresAt}
                      portalUrl={`${window.location.protocol}//${window.location.hostname}:5174`}
                      onRenew={() =>
                        dispatch({
                          type: 'members/upsert',
                          member: { ...m, ...invitationFields() },
                        })
                      }
                    />
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.applicationIds.length === 0 ? (
                      <span className="text-muted text-xs">No application access</span>
                    ) : (
                      m.applicationIds.map((id) => (
                        <Badge key={id} variant="outline">
                          {applicationsById.get(id)?.name ?? id}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
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
                    aria-label="Remove member"
                    className="text-accent"
                    onClick={() => setRemoving(m)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
      <MemberDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <InviteUserDialog
        tenant={inviting ? tenant : null}
        onOpenChange={(open) => !open && setInviting(false)}
      />
      <ConfirmDelete
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${usersById.get(removing?.userId ?? '')?.name ?? 'member'}?`}
        description={`They lose access to every application in ${tenant.name}. Their account stays.`}
        actionLabel="Remove"
        onConfirm={() => {
          if (removing) dispatch({ type: 'members/remove', id: removing.id })
          setRemoving(null)
        }}
      />
    </Card>
  )
}
