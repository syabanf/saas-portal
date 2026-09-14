import { fmtDaysUntil, fmtIdr } from '@scp/fixtures'
import type { AppAccessState } from '@scp/types'
import { APP_ACCESS_STATE_LABEL, BILLING_PERIOD_LABEL } from '@scp/types'
import { Button, IconTile, StatusDot, cn, type BadgeTone } from '@scp/ui'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import type { PortalApplication } from '../state/app-state'
import { useAuth } from '../auth/auth'
import { useScoped } from '../state/app-state'
import { usePortalSheets } from '../layouts/portal-sheets'
import { AdminContact } from './AdminContact'
import { AppTypeIcon } from './badges'

export const ACCESS_TONE: Record<AppAccessState, BadgeTone> = {
  active: 'success',
  trial: 'info',
  payment_required: 'warning',
  suspended: 'danger',
  expired: 'muted',
  not_subscribed: 'muted',
  not_assigned: 'muted',
  disabled: 'muted',
}

/** Second line of the card: what the organization pays for this application. */
export function pricingLine({ app, subscription }: PortalApplication): string {
  if (app.accessPolicy === 'free') return 'Free for workspace'
  if (!subscription) return 'Not subscribed'
  return `${BILLING_PERIOD_LABEL[subscription.billingPeriod]} · ${fmtIdr(subscription.price, subscription.currency)}`
}

function Action({ item }: { item: PortalApplication }) {
  const { app, access, subscription } = item
  const { member, tenant } = useAuth()
  const { invoices } = useScoped()
  const { openSupport } = usePortalSheets()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  if (tenant?.status === 'suspended')
    return isAdmin ? (
      <Button size="sm" variant="outline" onClick={openSupport}>
        Contact support
      </Button>
    ) : (
      <AdminContact application={app.name} />
    )
  const openable = ['active', 'trial', 'payment_required'].includes(access.state)
  if (!isAdmin && !openable) return <AdminContact application={app.name} />
  const invoice = invoices.find(
    (i) => i.subscriptionId === subscription?.id && ['open', 'overdue'].includes(i.status),
  )
  if (
    (access.state === 'suspended' && !invoice) ||
    (access.state === 'not_assigned' && app.accessPolicy === 'manual')
  )
    return (
      <Button size="sm" variant="outline" onClick={openSupport}>
        Contact support
      </Button>
    )
  switch (access.state) {
    case 'active':
    case 'trial':
    case 'payment_required':
      return (
        <Button size="sm" asChild>
          <a href={app.baseUrl} target="_blank" rel="noreferrer">
            Open <ArrowUpRight />
          </a>
        </Button>
      )
    case 'suspended':
    case 'expired':
      return (
        <Button size="sm" variant="secondary" asChild>
          <Link to={invoice ? `/billing/${invoice.id}/pay` : `/subscription?app=${app.id}`}>
            {invoice ? 'Pay invoice' : 'Review subscription'}
          </Link>
        </Button>
      )
    case 'not_subscribed':
      return (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/subscription?app=${app.id}`}>View pricing</Link>
        </Button>
      )
    case 'not_assigned':
      return (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/users?app=${app.id}`}>Assign access</Link>
        </Button>
      )
    case 'disabled':
      return null
  }
}

/** Launcher tile (blueprint §32, §43). Shows the subscription state; the application backend decides on entry. */
export function AppCard({ item, onDetails }: { item: PortalApplication; onDetails?: () => void }) {
  const { access } = item
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  return (
    <div
      role={onDetails ? 'button' : undefined}
      tabIndex={onDetails ? 0 : undefined}
      onClick={onDetails}
      onKeyDown={(e) => {
        if (onDetails && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onDetails()
        }
      }}
      className={cn(
        'rounded-card bg-card shadow-card flex flex-col gap-4 p-5',
        onDetails && 'hover:shadow-float cursor-pointer transition-transform active:scale-[0.98]',
        access.state === 'disabled' && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <IconTile>
          <AppTypeIcon type={item.app.type} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-semibold">{item.app.name}</p>
          <p className="text-muted mt-0.5 truncate text-sm">
            {isAdmin ? pricingLine(item) : 'Workspace application'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <StatusDot
            tone={ACCESS_TONE[access.state]}
            label={APP_ACCESS_STATE_LABEL[access.state]}
          />
          {access.until ? (
            <p className="text-muted mt-0.5 text-xs">{fmtDaysUntil(access.until)}</p>
          ) : null}
        </div>
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Action item={item} />
        </div>
      </div>
    </div>
  )
}
