import { avatarColor, fmtDateTime, initials, newId } from '@scp/fixtures'
import type { TenantMember, User, WorkspaceRole } from '@scp/types'
import { WORKSPACE_ROLE_LABEL } from '@scp/types'
import {
  Avatar,
  Badge,
  Button,
  Combobox,
  EmptyState,
  FormField,
  KeyValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@scp/ui'
import { Building2, Plus } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { Mono, UserBadge } from '../../components/badges'
import {
  MemberDialog,
  assignableApplications,
  emptyMember,
} from '../../components/master/MemberDialog'
import { labelOptions, tenantOptions } from '../../lib/options'
import { useScoped } from '../../state/app-state'

export interface UserSheetProps {
  user: User | null
  onOpenChange: (open: boolean) => void
}

const ROLE_OPTIONS = labelOptions(
  ['member', 'workspace_admin'] satisfies WorkspaceRole[],
  WORKSPACE_ROLE_LABEL,
)

export function UserSheet({ user, onOpenChange }: UserSheetProps) {
  const views = useScoped()
  const { tenants, tenantsById, membersByUser, applicationsById, dispatch } = views
  const [editing, setEditing] = React.useState<TenantMember | null>(null)
  const [tenantId, setTenantId] = React.useState('')
  const [role, setRole] = React.useState<WorkspaceRole>('member')
  React.useEffect(() => {
    if (user) {
      setTenantId('')
      setRole('member')
    }
  }, [user])

  const memberships = user ? (membersByUser.get(user.id) ?? []) : []
  const memberOf = new Set(memberships.map((m) => m.tenantId))
  const available = tenants.filter((t) => !memberOf.has(t.id))

  function addMembership(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !tenantId) return
    const applicationIds =
      role === 'workspace_admin' ? assignableApplications(views, tenantId).map((a) => a.id) : []
    dispatch({
      type: 'members/upsert',
      member: { ...emptyMember(tenantId, user.id, role, applicationIds), id: newId('mem') },
    })
    setTenantId('')
  }

  return (
    <Sheet open={user !== null} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        {user ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pr-8">
              <Avatar initials={initials(user.name)} color={avatarColor(user.id)} size="lg" />
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg font-semibold">{user.name}</SheetTitle>
                <SheetDescription className="text-muted truncate text-sm">
                  {user.email}
                </SheetDescription>
              </div>
            </div>

            <div className="bg-surface-2 rounded-2xl px-4">
              <KeyValue
                dense
                rows={[
                  { label: 'ID', value: <Mono>{user.id}</Mono> },
                  { label: 'Status', value: <UserBadge status={user.status} /> },
                  {
                    label: 'Platform admin',
                    value: user.platformAdmin ? <Badge variant="ink">Platform admin</Badge> : 'No',
                  },
                  { label: 'Created', value: fmtDateTime(user.createdAt) },
                  { label: 'Updated', value: fmtDateTime(user.updatedAt) },
                ]}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Organizations</p>
              {memberships.length === 0 ? (
                <EmptyState
                  className="py-6"
                  icon={<Building2 />}
                  title="Not a member anywhere"
                  description="Add this user to an organization to grant application access."
                />
              ) : (
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <div
                      key={m.id}
                      className="bg-surface-2 flex flex-wrap items-start gap-3 rounded-2xl p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/organizations/${m.tenantId}`}
                          className="truncate text-sm font-semibold hover:underline"
                        >
                          {tenantsById.get(m.tenantId)?.name ?? m.tenantId}
                        </Link>
                        <p className="text-muted text-xs">
                          {WORKSPACE_ROLE_LABEL[m.workspaceRole]}
                        </p>
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
                      <Button variant="outline" size="sm" onClick={() => setEditing(m)}>
                        Edit access
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={addMembership} className="bg-surface rounded-2xl p-4">
              <p className="mb-3 text-sm font-semibold">Add to organization</p>
              {available.length === 0 ? (
                <p className="text-muted text-sm">
                  This user already belongs to every organization.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <FormField label="Organization" htmlFor="membership-org">
                    <Combobox
                      id="membership-org"
                      value={tenantId}
                      onChange={setTenantId}
                      options={tenantOptions(available)}
                      placeholder="Select organization"
                      searchPlaceholder="Search organizations…"
                    />
                  </FormField>
                  <FormField label="Workspace role" htmlFor="membership-role">
                    <Combobox
                      id="membership-role"
                      value={role}
                      onChange={(v) => setRole(v as WorkspaceRole)}
                      options={ROLE_OPTIONS}
                      searchPlaceholder="Search roles…"
                    />
                  </FormField>
                  <Button type="submit" variant="secondary" className="h-11" disabled={!tenantId}>
                    <Plus /> Add
                  </Button>
                </div>
              )}
            </form>
          </div>
        ) : null}
        <MemberDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} />
      </SheetContent>
    </Sheet>
  )
}
