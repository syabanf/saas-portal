import { fmtIdr } from '@scp/fixtures'
import { useT, type Translate } from '@scp/i18n'
import type { AppAccessState } from '@scp/types'
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
export function pricingLine(t: Translate, { app, subscription }: PortalApplication): string {
  if (app.accessPolicy === 'free') return t('common.freeForWorkspace')
  if (!subscription) return t('common.notSubscribed')
  return `${t(`period.${subscription.billingPeriod}`)} · ${fmtIdr(subscription.price, subscription.currency)}`
}

function daysUntil(t: Translate, iso: string, now: number): string {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000)
  if (days < 0) return t('common.daysOverdue', { count: Math.abs(days) })
  if (days === 0) return t('common.today')
  if (days === 1) return t('common.oneDayRemaining')
  return t('common.daysRemaining', { count: days })
}

function Action({ item }: { item: PortalApplication }) {
  const t = useT()
  const { app, access, subscription } = item
  const { member, tenant } = useAuth()
  const { invoices } = useScoped()
  const { openSupport } = usePortalSheets()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  if (tenant?.status === 'suspended')
    return isAdmin ? (
      <Button size="sm" variant="outline" onClick={openSupport}>
        {t('common.contactSupport')}
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
        {t('common.contactSupport')}
      </Button>
    )
  switch (access.state) {
    case 'active':
    case 'trial':
    case 'payment_required':
      return (
        <Button size="sm" asChild>
          <a href={app.baseUrl} target="_blank" rel="noreferrer">
            {t('common.open')} <ArrowUpRight />
          </a>
        </Button>
      )
    case 'suspended':
    case 'expired':
      return (
        <Button size="sm" variant="secondary" asChild>
          <Link to={invoice ? `/billing/${invoice.id}/pay` : `/subscription?app=${app.id}`}>
            {invoice ? t('common.payInvoice') : t('common.reviewSubscription')}
          </Link>
        </Button>
      )
    case 'not_subscribed':
      return (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/subscription?app=${app.id}`}>{t('appCard.viewPricing')}</Link>
        </Button>
      )
    case 'not_assigned':
      return (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/users?app=${app.id}`}>{t('appCard.assignAccess')}</Link>
        </Button>
      )
    case 'disabled':
      return null
  }
}

/** Launcher tile (blueprint §32, §43). Shows the subscription state; the application backend decides on entry. */
export function AppCard({ item, onDetails }: { item: PortalApplication; onDetails?: () => void }) {
  const t = useT()
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
            {isAdmin ? pricingLine(t, item) : t('appCard.workspaceApplication')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <StatusDot tone={ACCESS_TONE[access.state]} label={t(`status.access.${access.state}`)} />
          {access.until ? (
            <p className="text-muted mt-0.5 text-xs">{daysUntil(t, access.until, Date.now())}</p>
          ) : null}
        </div>
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Action item={item} />
        </div>
      </div>
    </div>
  )
}
