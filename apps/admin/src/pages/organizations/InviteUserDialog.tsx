import { invitationFields, isUserFacing, newId } from '@scp/fixtures'
import type { Tenant } from '@scp/types'
import { InvitationDialog } from '@scp/ui'
import { useScoped } from '../../state/app-state'
export function InviteUserDialog({
  tenant,
  onOpenChange,
}: {
  tenant: Tenant | null
  onOpenChange: (open: boolean) => void
}) {
  const { users, membersByTenant, subscriptionsByTenant, applications, dispatch } = useScoped()
  const subscriptions = subscriptionsByTenant.get(tenant?.id ?? '') ?? []
  return (
    <InvitationDialog
      open={Boolean(tenant)}
      onOpenChange={onOpenChange}
      people={users}
      memberUserIds={(membersByTenant.get(tenant?.id ?? '') ?? []).map((m) => m.userId)}
      applications={applications.filter(
        (a) =>
          a.status === 'active' &&
          isUserFacing(a) &&
          (a.accessPolicy === 'free' || subscriptions.some((s) => s.applicationId === a.id)),
      )}
      onInvite={(draft) => {
        if (!tenant) return
        const existing = users.find((u) => u.email.toLowerCase() === draft.email)
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
            tenantId: tenant.id,
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
