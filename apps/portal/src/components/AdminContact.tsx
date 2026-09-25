import { useT } from '@scp/i18n'
import { Button, Sheet, SheetContent, SheetTitle, SheetDescription } from '@scp/ui'
import * as React from 'react'
import { useScoped } from '../state/app-state'

export function AdminContact({ application }: { application?: string }) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const { members, tenant } = useScoped()
  const subject = application ?? t('adminContact.defaultSubject')
  const admins = members.filter(
    (m) => m.workspaceRole === 'workspace_admin' && m.status === 'active',
  )
  const mailSubject = t('adminContact.mailSubject', {
    application: subject,
    organization: tenant?.name ?? t('adminContact.ourWorkspace'),
  })
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t('adminContact.button')}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="max-w-md p-6">
          <SheetTitle>{t('adminContact.title', { application: subject })}</SheetTitle>
          <SheetDescription>{t('adminContact.description')}</SheetDescription>
          <div className="mt-6 space-y-4">
            {admins.map((admin) => (
              <div key={admin.id}>
                <p className="font-semibold">{admin.user.name}</p>
                <a
                  className="text-accent underline"
                  href={`mailto:${admin.user.email}?subject=${encodeURIComponent(mailSubject)}`}
                >
                  {admin.user.email}
                </a>
              </div>
            ))}
            {!admins.length && (
              <p>
                {t('adminContact.fallback')}{' '}
                <a className="underline" href={`mailto:${tenant?.billingEmail ?? ''}`}>
                  {tenant?.billingEmail ?? t('adminContact.usualContact')}
                </a>
                .
              </p>
            )}
            <p className="text-muted text-sm">{t('adminContact.mailNote')}</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
