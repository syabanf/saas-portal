import { avatarColor, initials, invitationFields } from '@scp/fixtures'
import type { Tenant, TenantMember } from '@scp/types'
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
  ConfirmDelete,
  EmptyState,
} from '@scp/ui'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import * as React from 'react'
import { UserBadge } from '../../components/badges'
import { MemberDialog } from '../../components/master/MemberDialog'
import { useScoped } from '../../state/app-state'
import { InviteUserDialog } from './InviteUserDialog'

export function MembersCard({ tenant }: { tenant: Tenant }) {
  const { membersByTenant, usersById, applicationsById, dispatch } = useScoped()
  const [editing, setEditing] = React.useState<TenantMember | null>(null)
  const [removing, setRemoving] = React.useState<TenantMember | null>(null)
  const [inviting, setInviting] = React.useState(false)
  const members = membersByTenant.get(tenant.id) ?? []

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
        ) : (
          members.map((m) => {
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
