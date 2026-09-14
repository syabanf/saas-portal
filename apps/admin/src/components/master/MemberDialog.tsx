import { newId } from '@scp/fixtures'
import type { Application, TenantMember, WorkspaceRole } from '@scp/types'
import { APPLICATION_TYPE_LABEL, WORKSPACE_ROLE_LABEL } from '@scp/types'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  OptionCard,
} from '@scp/ui'
import * as React from 'react'
import { useScoped, type ScopedViews } from '../../state/app-state'

export function emptyMember(
  tenantId: string,
  userId: string,
  workspaceRole: WorkspaceRole = 'member',
  applicationIds: string[] = [],
): TenantMember {
  return { id: '', tenantId, userId, workspaceRole, status: 'invited', applicationIds }
}

/** Applications a member of this organization can be granted: subscribed applications plus free ones. */
export function assignableApplications(
  views: Pick<ScopedViews, 'applications' | 'subscriptionsByTenant'>,
  tenantId: string,
): Application[] {
  const subscribed = new Set(
    (views.subscriptionsByTenant.get(tenantId) ?? []).map((s) => s.applicationId),
  )
  return views.applications.filter(
    (a) => a.status !== 'disabled' && (subscribed.has(a.id) || a.accessPolicy === 'free'),
  )
}

const ROLES: { value: WorkspaceRole; description: string }[] = [
  { value: 'member', description: 'Opens the applications listed below.' },
  {
    value: 'workspace_admin',
    description: 'Also manages users, subscriptions and billing for this organization.',
  },
]

export interface MemberDialogProps {
  /** null = closed; `id === ''` = create. */
  member: TenantMember | null
  onOpenChange: (open: boolean) => void
}

/** Workspace role plus per-application access (blueprint §39). Roles inside an application stay with that application. */
export function MemberDialog({ member, onOpenChange }: MemberDialogProps) {
  const views = useScoped()
  const { tenantsById, usersById, dispatch } = views
  const [draft, setDraft] = React.useState<TenantMember>(() => member ?? emptyMember('', ''))
  React.useEffect(() => {
    if (member) setDraft(member)
  }, [member])

  const tenant = tenantsById.get(draft.tenantId)
  const person = usersById.get(draft.userId)
  const apps = React.useMemo(
    () => assignableApplications(views, draft.tenantId),
    [views, draft.tenantId],
  )

  function toggleApp(id: string, on: boolean) {
    setDraft((d) => ({
      ...d,
      applicationIds: on
        ? Array.from(new Set([...d.applicationIds, id]))
        : d.applicationIds.filter((x) => x !== id),
    }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.tenantId || !draft.userId) return
    dispatch({ type: 'members/upsert', member: { ...draft, id: draft.id || newId('mem') } })
    onOpenChange(false)
  }

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{person?.name ?? 'Member'} access</DialogTitle>
            <DialogDescription>
              {tenant
                ? `Workspace role and application access in ${tenant.name}.`
                : 'Workspace role and application access.'}{' '}
              Roles inside an application are managed by that application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Workspace role</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <OptionCard
                    key={r.value}
                    selected={draft.workspaceRole === r.value}
                    title={WORKSPACE_ROLE_LABEL[r.value]}
                    description={r.description}
                    onSelect={() => setDraft((d) => ({ ...d, workspaceRole: r.value }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Application access</p>
              {apps.length === 0 ? (
                <EmptyState
                  className="py-6"
                  title="No applications available"
                  description="Add a subscription to this organization first. Free applications appear here automatically."
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {apps.map((a) => (
                    <label
                      key={a.id}
                      className="bg-surface flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
                    >
                      <Checkbox
                        checked={draft.applicationIds.includes(a.id)}
                        onChange={(e) => toggleApp(a.id, e.target.checked)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="text-muted block truncate text-xs">
                          {APPLICATION_TYPE_LABEL[a.type]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!draft.tenantId || !draft.userId}>
              Save access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
