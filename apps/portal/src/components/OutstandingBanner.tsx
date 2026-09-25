import { fmtIdr } from '@scp/fixtures'
import { useFormat, useT } from '@scp/i18n'
import { Banner, Button } from '@scp/ui'
import { AlertTriangle, Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth'
import { AdminContact } from './AdminContact'
import { usePortalSheets } from '../layouts/portal-sheets'
import { useScoped } from '../state/app-state'

/** Payment-required callout (blueprint §42) plus the organization-suspended case (§44). */
export function OutstandingBanner() {
  const t = useT()
  const { formatDate } = useFormat()
  const { tenant, subscriptions, invoices, applicationsById } = useScoped()
  const { openSupport } = usePortalSheets()
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'

  if (tenant?.status === 'suspended') {
    return (
      <Banner
        tone="danger"
        icon={<Building2 />}
        title={t('banner.organizationSuspended')}
        description={
          isAdmin ? t('banner.organizationSuspendedAdmin') : t('banner.organizationSuspendedMember')
        }
        action={
          isAdmin ? (
            <Button size="sm" variant="secondary" onClick={openSupport}>
              {t('common.contactSupport')}
            </Button>
          ) : (
            <AdminContact />
          )
        }
      />
    )
  }

  const sub = subscriptions.find(
    (s) =>
      s.status === 'past_due' ||
      s.status === 'grace_period' ||
      s.status === 'suspended' ||
      s.status === 'expired',
  )
  if (!sub) return null
  const invoice = invoices
    .filter((i) => i.subscriptionId === sub.id && (i.status === 'open' || i.status === 'overdue'))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]
  const app = applicationsById.get(sub.applicationId)?.name ?? t('common.theApplication')
  const until = formatDate(sub.gracePeriodEnd ?? sub.currentPeriodEnd)
  const blocked = sub.status === 'suspended' || sub.status === 'expired'
  const description = !isAdmin
    ? blocked
      ? t('banner.memberBlocked', { app })
      : t('banner.memberUntil', { app, until })
    : blocked
      ? invoice
        ? t('banner.adminBlockedPay', { app })
        : t('banner.adminBlockedReview', { app })
      : invoice
        ? t('banner.adminInvoice', {
            app,
            until,
            number: invoice.number,
            amount: fmtIdr(invoice.total, invoice.currency),
          })
        : t('banner.adminUntil', { app, until })
  return (
    <Banner
      tone="warning"
      icon={<AlertTriangle />}
      title={blocked ? t('banner.accessPaused') : t('banner.needsAttention')}
      description={description}
      action={
        isAdmin ? (
          <Button size="sm" asChild>
            <Link
              to={invoice ? `/billing/${invoice.id}/pay` : `/subscription?app=${sub.applicationId}`}
            >
              {invoice ? t('common.payInvoice') : t('common.reviewSubscription')}
            </Link>
          </Button>
        ) : (
          <AdminContact application={app} />
        )
      }
    />
  )
}
