import { fmtDate, fmtIdr } from '@scp/fixtures'
import { Banner, Button } from '@scp/ui'
import { AlertTriangle, Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth'
import { AdminContact } from './AdminContact'
import { usePortalSheets } from '../layouts/portal-sheets'
import { useScoped } from '../state/app-state'

/** Payment-required callout (blueprint §42) plus the organization-suspended case (§44). */
export function OutstandingBanner() {
  const { tenant, subscriptions, invoices, applicationsById } = useScoped()
  const { openSupport } = usePortalSheets()
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'

  if (tenant?.status === 'suspended') {
    return (
      <Banner
        tone="danger"
        icon={<Building2 />}
        title="Organization suspended."
        description={
          isAdmin
            ? 'Applications stay closed until the account is restored. Billing and support remain available.'
            : 'Applications stay closed until your organization is restored. Contact your workspace admin for help.'
        }
        action={
          isAdmin ? (
            <Button size="sm" variant="secondary" onClick={openSupport}>
              Contact support
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
  const appName = applicationsById.get(sub.applicationId)?.name ?? 'the application'
  const until = fmtDate(sub.gracePeriodEnd ?? sub.currentPeriodEnd)
  const blocked = sub.status === 'suspended' || sub.status === 'expired'
  const description = !isAdmin
    ? `${appName} ${blocked ? 'is unavailable' : `remains available until ${until}`}. Your workspace admin can restore access.`
    : blocked
      ? `${appName} is unavailable. ${invoice ? 'Pay the outstanding invoice to restore the subscription.' : 'Review the subscription to restore access.'}`
      : invoice
        ? `Access to ${appName} remains available until ${until} · Invoice ${invoice.number} · Outstanding ${fmtIdr(invoice.total, invoice.currency)}`
        : `Access to ${appName} remains available until ${until}.`
  return (
    <Banner
      tone="warning"
      icon={<AlertTriangle />}
      title={blocked ? 'Application access paused' : 'Subscription needs attention'}
      description={description}
      action={
        isAdmin ? (
          <Button size="sm" asChild>
            <Link
              to={invoice ? `/billing/${invoice.id}/pay` : `/subscription?app=${sub.applicationId}`}
            >
              {invoice ? 'Pay invoice' : 'Review subscription'}
            </Link>
          </Button>
        ) : (
          <AdminContact application={appName} />
        )
      }
    />
  )
}
