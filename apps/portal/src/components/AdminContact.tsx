import { Button, Sheet, SheetContent, SheetTitle, SheetDescription } from '@scp/ui'
import * as React from 'react'
import { useScoped } from '../state/app-state'

export function AdminContact({ application = 'application access' }: { application?: string }) {
  const [open, setOpen] = React.useState(false)
  const { members, tenant } = useScoped()
  const admins = members.filter(
    (m) => m.workspaceRole === 'workspace_admin' && m.status === 'active',
  )
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Contact your admin
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-md p-6">
          <SheetTitle>Get access to {application}</SheetTitle>
          <SheetDescription>
            Contact a workspace admin to assign access or resolve the organization’s subscription.
          </SheetDescription>
          <div className="mt-6 space-y-4">
            {admins.map((admin) => (
              <div key={admin.id}>
                <p className="font-semibold">{admin.user.name}</p>
                <a
                  className="text-accent underline"
                  href={`mailto:${admin.user.email}?subject=${encodeURIComponent(`Access to ${application} in ${tenant?.name ?? 'our workspace'}`)}`}
                >
                  {admin.user.email}
                </a>
              </div>
            ))}
            {!admins.length && (
              <p>
                Contact your organization at{' '}
                <a className="underline" href={`mailto:${tenant?.billingEmail ?? ''}`}>
                  {tenant?.billingEmail ?? 'your usual support contact'}
                </a>
                .
              </p>
            )}
            <p className="text-muted text-sm">
              The email link opens your email app. You can review your message before sending.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
