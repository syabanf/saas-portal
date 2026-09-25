import { useFormat, useT } from '@scp/i18n'
import { Badge, Button, Sheet, SheetContent, SheetDescription, SheetTitle } from '@scp/ui'
import { Bell, CheckCircle2, CreditCard, ShieldAlert, UserRoundPlus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/auth'
import { useScoped } from '../state/app-state'

export function PortalActionCenter({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const { formatDate } = useFormat()
  const { subscriptions, invoices, applications, members } = useScoped()
  const { member } = useAuth()
  const navigate = useNavigate()
  const admin = member?.workspaceRole === 'workspace_admin'
  const items = admin
    ? [
        ...invoices
          .filter((invoice) => invoice.status === 'overdue' || invoice.status === 'open')
          .map((invoice) => ({
            key: `invoice-${invoice.id}`,
            title: t('actionCenter.invoiceTitle', {
              number: invoice.number,
              status: t(`status.invoice.${invoice.status}`).toLowerCase(),
            }),
            description: t('actionCenter.due', { date: formatDate(invoice.dueDate) }),
            to: `/billing/${invoice.id}`,
            label: t('actionCenter.reviewInvoice'),
            urgent: invoice.status === 'overdue',
            icon: CreditCard,
          })),
        ...subscriptions
          .filter((sub) => ['past_due', 'grace_period', 'suspended'].includes(sub.status))
          .map((sub) => ({
            key: `sub-${sub.id}`,
            title: t('actionCenter.subscriptionTitle', {
              status: t(`status.subscription.${sub.status}`).toLowerCase(),
            }),
            description:
              applications.find((item) => item.app.id === sub.applicationId)?.app.name ??
              t('common.application'),
            to: `/subscription?app=${sub.applicationId}`,
            label: t('common.reviewSubscription'),
            urgent: true,
            icon: ShieldAlert,
          })),
        ...members
          .filter((item) => item.status === 'invited')
          .map((item) => ({
            key: `member-${item.id}`,
            title: t('actionCenter.notJoined', { name: item.user.name }),
            description: item.user.email,
            to: '/users',
            label: t('actionCenter.manageInvitation'),
            urgent: false,
            icon: UserRoundPlus,
          })),
      ]
    : applications
        .filter((item) => item.access.state !== 'active' && item.access.state !== 'trial')
        .map((item) => ({
          key: item.app.id,
          title: t('actionCenter.appUnavailable', { name: item.app.name }),
          description: t(`status.access.${item.access.state}`),
          to: '/applications',
          label: t('actionCenter.viewAccess'),
          urgent: ['payment_required', 'suspended', 'expired'].includes(item.access.state),
          icon: ShieldAlert,
        }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-5">
        <div className="flex items-center gap-3">
          <span className="bg-accent-soft text-accent flex size-10 items-center justify-center rounded-full">
            <Bell className="size-4" />
          </span>
          <div>
            <SheetTitle className="text-xl font-bold">{t('actionCenter.title')}</SheetTitle>
            <SheetDescription className="text-muted text-sm">
              {t('actionCenter.description')}
            </SheetDescription>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {items.length ? (
            items.slice(0, 20).map((item) => (
              <article key={item.key} className="border-border rounded-2xl border p-4">
                <div className="flex items-start gap-3">
                  <item.icon className="text-accent mt-0.5 size-5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <Badge variant={item.urgent ? 'danger' : 'warning'}>
                        {item.urgent ? t('actionCenter.actionNeeded') : t('actionCenter.review')}
                      </Badge>
                    </div>
                    <p className="text-muted mt-1 text-xs">{item.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        navigate(item.to)
                        onOpenChange(false)
                      }}
                    >
                      {item.label}
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="py-16 text-center">
              <CheckCircle2 className="text-success mx-auto size-8" />
              <p className="mt-3 font-semibold">{t('actionCenter.caughtUp')}</p>
              <p className="text-muted mt-1 text-sm">{t('actionCenter.noTasks')}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
