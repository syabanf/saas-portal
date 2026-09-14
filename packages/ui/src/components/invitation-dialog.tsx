import * as React from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { FormField, Input, Select, Checkbox } from './input'

export interface InvitationDraft {
  name: string
  email: string
  workspaceRole: 'member' | 'workspace_admin'
  applicationIds: string[]
}
export function InvitationDialog({
  open,
  onOpenChange,
  people,
  memberUserIds,
  applications,
  onInvite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: { id: string; email: string; name: string; platformAdmin: boolean; status: string }[]
  memberUserIds: string[]
  applications: { id: string; name: string }[]
  onInvite: (draft: InvitationDraft) => void
}) {
  const [draft, setDraft] = React.useState<InvitationDraft>({
    name: '',
    email: '',
    workspaceRole: 'member',
    applicationIds: [],
  })
  React.useEffect(() => {
    if (open) setDraft({ name: '', email: '', workspaceRole: 'member', applicationIds: [] })
  }, [open])
  const email = draft.email.trim().toLowerCase()
  const existing = people.find((p) => p.email.toLowerCase() === email)
  const error =
    existing && memberUserIds.includes(existing.id)
      ? 'This person is already a member. Manage their access or renew their invitation from the member list.'
      : existing?.platformAdmin
        ? 'Use a tenant account instead of a platform admin account.'
        : existing?.status === 'disabled'
          ? 'This account is disabled. Contact the platform admin.'
          : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!error && (existing || draft.name.trim()))
              onInvite({ ...draft, name: existing?.name ?? draft.name.trim(), email })
          }}
        >
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Choose their role and applications before creating an invitation. Demo invitations use
              a shareable link; no email is sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Email"
              htmlFor="invitation-email"
              error={error ?? undefined}
              hint={
                existing && !error
                  ? `${existing.name} already has an account. This invitation adds a workspace membership.`
                  : undefined
              }
            >
              <Input
                id="invitation-email"
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </FormField>
            {!existing && (
              <FormField label="Name" htmlFor="invitation-name">
                <Input
                  id="invitation-name"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </FormField>
            )}
            <FormField label="Workspace role" htmlFor="invitation-role">
              <Select
                id="invitation-role"
                value={draft.workspaceRole}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    workspaceRole: e.target.value as InvitationDraft['workspaceRole'],
                  })
                }
              >
                <option value="member">Member</option>
                <option value="workspace_admin">Workspace admin</option>
              </Select>
            </FormField>
            <fieldset className="space-y-2">
              <legend className="mb-2 font-medium">Application access</legend>
              {applications.map((app) => (
                <label key={app.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={draft.applicationIds.includes(app.id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        applicationIds: e.target.checked
                          ? [...draft.applicationIds, app.id]
                          : draft.applicationIds.filter((id) => id !== app.id),
                      })
                    }
                  />
                  {app.name}
                </label>
              ))}
              {!applications.length && (
                <p className="text-muted text-sm">
                  No applications are available to assign yet. Add a subscription from the
                  organization first.
                </p>
              )}
            </fieldset>
            {!draft.applicationIds.length && (
              <p className="text-muted text-sm">
                This person will join with no application access. You can assign it later.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={Boolean(error)} type="submit">
              Create invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InvitationLink({
  token,
  expiresAt,
  onRenew,
  portalUrl,
}: {
  token?: string
  expiresAt?: string
  onRenew: () => void
  portalUrl: string
}) {
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState(false)
  const url = token ? `${portalUrl}/invite/${token}` : ''
  const expired = !expiresAt || Date.parse(expiresAt) <= Date.now()
  return (
    <div className="mt-2 space-y-2 text-sm">
      <p className="text-muted">
        {expired
          ? 'Invitation expired or not yet issued.'
          : `Invitation expires ${new Date(expiresAt!).toLocaleDateString()}.`}
      </p>
      {url && !expired && (
        <>
          <a className="text-accent inline-flex min-h-11 items-center underline" href={url} target="_blank" rel="noreferrer">
            Open invitation
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                setError(false)
              } catch {
                setError(true)
              }
            }}
          >
            {copied ? 'Copied' : 'Copy invitation link'}
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setCopied(false)
          onRenew()
        }}
      >
        Renew invitation link
      </Button>
      {error && <p role="alert">Copy this link manually: {url}</p>}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {copied ? 'Invitation link copied to clipboard.' : ''}
      </span>
      <p className="text-muted text-xs">
        Renewing invalidates the previous link. Share the new link with the invited person.
      </p>
    </div>
  )
}
