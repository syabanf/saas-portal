import { buildInvoice, fmtDate, fmtIdr, newId, nextInvoiceNumber, priceFor } from '@scp/fixtures'
import type { BillingPeriod, Subscription } from '@scp/types'
import { BILLING_PERIODS, BILLING_PERIOD_LABEL } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  IconTile,
  PageHeader,
  cn,
} from '@scp/ui'
import { Receipt } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { AppTypeIcon, SubscriptionBadge } from '../../components/badges'
import { actorOf, useScoped, type PortalApplication } from '../../state/app-state'
import { usePortalSheets } from '../../layouts/portal-sheets'
import { PaymentHistoryList } from './PaymentHistoryList'

const DAY = 86_400_000
const PERIOD_DAYS: Record<BillingPeriod, number> = { monthly: 30, annual: 365 }
const PERIOD_SUFFIX: Record<BillingPeriod, string> = { monthly: '/ month', annual: '/ year' }

type Pending =
  | { kind: 'switch'; period: BillingPeriod }
  | { kind: 'start'; period: BillingPeriod }
  | { kind: 'cancel' }
  | null

function annualSaving(priceMonthly: number, priceAnnual: number): number | null {
  if (priceMonthly <= 0 || priceAnnual <= 0 || priceAnnual >= priceMonthly * 12) return null
  return Math.round((1 - priceAnnual / (priceMonthly * 12)) * 100)
}

function describePending(
  pending: Exclude<Pending, null>,
  app: PortalApplication['app'],
  subscription: Subscription | null,
): { title: string; description: string } {
  if (pending.kind === 'cancel') {
    return {
      title: `Cancel ${app.name}?`,
      description: `Access continues until ${fmtDate(subscription?.currentPeriodEnd)}. Nothing renews after that.`,
    }
  }
  const price = `${fmtIdr(priceFor(app, pending.period), app.currency)} ${PERIOD_SUFFIX[pending.period]}`
  if (pending.kind === 'switch') {
    return {
      title: `Switch ${app.name} to ${BILLING_PERIOD_LABEL[pending.period].toLowerCase()} billing?`,
      description: `New price ${price} from the next renewal.`,
    }
  }
  if (!subscription && app.trialDays > 0)
    return {
      title: `Start a trial of ${app.name}?`,
      description: `${app.trialDays} days free, then ${price}.`,
    }
  return {
    title: `Subscribe to ${app.name}?`,
    description: `${price}. An invoice is issued today and due in 14 days.`,
  }
}

function ApplicationSection({
  item,
  highlighted,
  sectionRef,
}: {
  item: PortalApplication
  highlighted: boolean
  sectionRef: (el: HTMLDivElement | null) => void
}) {
  const { app, subscription } = item
  const { openSupport } = usePortalSheets()
  const user = useCurrentUser()
  const { member } = useAuth()
  const { tenantId, invoices, dispatch } = useScoped()
  const [started, setStarted] = React.useState(false)
  const [pending, setPending] = React.useState<Pending>(null)
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  const actor = actorOf(user)
  const outstanding = invoices.find(
    (i) => i.subscriptionId === subscription?.id && ['open', 'overdue'].includes(i.status),
  )
  const ended = Boolean(
    subscription &&
    (subscription.status === 'expired' ||
      (['suspended', 'cancelled'].includes(subscription.status) &&
        Date.parse(subscription.currentPeriodEnd) <= Date.now())),
  )
  const renewalInvoiced = Boolean(
    subscription &&
    invoices.some(
      (i) =>
        i.subscriptionId === subscription.id &&
        i.status !== 'void' &&
        i.periodStart >= subscription.currentPeriodEnd,
    ),
  )
  const cancelled = subscription?.status === 'cancelled' || subscription?.cancelAtPeriodEnd === true
  const saving = annualSaving(app.priceMonthly, app.priceAnnual)
  const confirm = pending ? describePending(pending, app, subscription) : null

  function start(period: BillingPeriod) {
    const now = Date.now()
    const status = !subscription && app.trialDays > 0 ? 'trial' : 'active'
    const days = status === 'trial' ? app.trialDays : PERIOD_DAYS[period]
    const price = priceFor(app, period)
    const at = new Date(now).toISOString()
    const sub: Subscription = {
      id: subscription?.id ?? newId('sub'),
      tenantId,
      applicationId: app.id,
      billingPeriod: period,
      price,
      currency: app.currency,
      status,
      startedAt: at,
      currentPeriodStart: at,
      currentPeriodEnd: new Date(now + days * DAY).toISOString(),
      gracePeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: at,
      updatedAt: at,
    }
    dispatch({ type: 'subscriptions/upsert', subscription: sub, actor })
    setStarted(true)
    if (status === 'active') {
      dispatch({
        type: 'invoices/upsert',
        invoice: buildInvoice(sub, app, {
          id: newId('inv'),
          number: nextInvoiceNumber(invoices, now),
          periodStart: sub.currentPeriodStart,
          issuedAt: at,
        }),
      })
    }
  }

  function confirmPending() {
    if (!pending) return
    if (pending.kind === 'start') start(pending.period)
    if (pending.kind === 'switch' && subscription)
      dispatch({
        type: 'subscriptions/changePeriod',
        id: subscription.id,
        billingPeriod: pending.period,
        actor,
      })
    if (pending.kind === 'cancel' && subscription)
      dispatch({ type: 'subscriptions/cancel', id: subscription.id, actor })
    setPending(null)
  }

  function periodButton(period: BillingPeriod) {
    if (priceFor(app, period) <= 0) return null
    if (!subscription || (ended && !outstanding)) {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!isAdmin}
          onClick={() => setPending({ kind: 'start', period })}
        >
          {ended
            ? 'Renew subscription'
            : app.trialDays > 0
              ? `Start ${app.trialDays}-day trial`
              : 'Subscribe'}
        </Button>
      )
    }
    if (subscription.billingPeriod === period) {
      return (
        <Button variant="outline" size="sm" className="w-full" disabled>
          Current
        </Button>
      )
    }
    return (
      <Button
        size="sm"
        className="w-full"
        disabled={
          !isAdmin || cancelled || Boolean(subscription.scheduledChange) || ended || renewalInvoiced
        }
        onClick={() => setPending({ kind: 'switch', period })}
      >
        Switch to {BILLING_PERIOD_LABEL[period].toLowerCase()}
      </Button>
    )
  }

  return (
    <Card
      ref={sectionRef}
      className={cn('scroll-mt-4 transition-shadow', highlighted && 'ring-accent/40 ring-2')}
    >
      <CardHeader className="flex-row flex-wrap items-start gap-3 space-y-0">
        <IconTile>
          <AppTypeIcon type={app.type} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">{app.name}</CardTitle>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            {subscription ? (
              <>
                <SubscriptionBadge status={subscription.status} />
                <span className="text-muted text-xs">
                  {BILLING_PERIOD_LABEL[subscription.billingPeriod]} ·{' '}
                  {fmtIdr(subscription.price, subscription.currency)}{' '}
                  {PERIOD_SUFFIX[subscription.billingPeriod]}
                </span>
              </>
            ) : (
              <>
                <Badge variant="muted">Not subscribed</Badge>
                {app.trialDays > 0 ? (
                  <span className="text-muted text-xs">{app.trialDays}-day free trial</span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {started && subscription && (
          <Banner
            icon={<Receipt />}
            tone="success"
            title="Subscription ready"
            description="Assign access to the people who will use this application."
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link to={`/users?app=${app.id}`}>Assign users</Link>
                </Button>
                {item.access.state === 'active' || item.access.state === 'trial' ? (
                  <Button size="sm" asChild>
                    <a href={app.baseUrl} target="_blank" rel="noreferrer">
                      Open application
                    </a>
                  </Button>
                ) : null}
                {outstanding && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/billing/${outstanding.id}`}>View invoice</Link>
                  </Button>
                )}
              </div>
            }
          />
        )}
        {subscription?.status === 'suspended' && !outstanding && (
          <Banner
            icon={<Receipt />}
            tone="warning"
            title="Access suspended"
            description="There is no outstanding invoice. Support can review why access was suspended."
            action={
              <Button size="sm" variant="outline" onClick={openSupport}>
                Contact support
              </Button>
            }
          />
        )}
        {outstanding && !started && (
          <Banner
            icon={<Receipt />}
            tone="warning"
            title="Outstanding invoice"
            description="Review and pay this invoice before starting another subscription period."
            action={
              <Button size="sm" asChild>
                <Link to={`/billing/${outstanding.id}/pay`}>Pay invoice</Link>
              </Button>
            }
          />
        )}
        {renewalInvoiced && (
          <p className="text-muted text-sm">
            The next period has already been invoiced. Contact support to change its billing period.
          </p>
        )}
        {subscription?.scheduledChange && (
          <Banner
            icon={<Receipt />}
            tone="info"
            title="Billing change scheduled"
            description={`${BILLING_PERIOD_LABEL[subscription.scheduledChange.billingPeriod]} · ${fmtIdr(subscription.scheduledChange.price, subscription.currency)} from ${fmtDate(subscription.scheduledChange.effectiveAt)}. Your current price remains unchanged until then.`}
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={renewalInvoiced}
                onClick={() =>
                  dispatch({ type: 'subscriptions/cancelChange', id: subscription.id, actor })
                }
              >
                Keep current billing
              </Button>
            }
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BILLING_PERIODS.map((period) => {
            const current = subscription?.billingPeriod === period
            const price = priceFor(app, period)
            return (
              <div key={period} className="bg-surface-2 flex flex-col overflow-hidden rounded-2xl">
                {current ? (
                  <p className="bg-ink text-on-ink px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    Current billing period
                  </p>
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">{BILLING_PERIOD_LABEL[period]}</p>
                    {price > 0 ? (
                      <p className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight tabular-nums">
                          {fmtIdr(price, app.currency)}
                        </span>
                        <span className="text-muted text-xs">{PERIOD_SUFFIX[period]}</span>
                      </p>
                    ) : (
                      <p className="text-muted mt-1 text-sm">Not offered</p>
                    )}
                    {period === 'annual' && saving !== null ? (
                      <p className="text-muted mt-1 text-xs">
                        Save {saving}% against monthly billing
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-auto">{periodButton(period)}</div>
                </div>
              </div>
            )
          })}
        </div>
        {subscription ? (
          <>
            <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
              <span className="text-muted">
                {cancelled ? 'Ends' : 'Renews'} {fmtDate(subscription.currentPeriodEnd)}
              </span>
              {subscription.status === 'cancelled' && !ended ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() =>
                    dispatch({ type: 'subscriptions/reactivate', id: subscription.id, actor })
                  }
                >
                  Reactivate
                </Button>
              ) : cancelled || ended ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => setPending({ kind: 'cancel' })}
                >
                  Cancel at period end
                </Button>
              )}
            </div>
            <PaymentHistoryList subscription={subscription} />
          </>
        ) : null}
        {!isAdmin ? (
          <p className="text-muted text-xs">
            Workspace admins manage the subscription for the organization.
          </p>
        ) : null}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as is</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>
              {pending?.kind === 'cancel' ? 'Cancel subscription' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** Blueprint §37: one subscription per application, owned by the organization rather than a single user. */
export function SubscriptionPage() {
  const [params] = useSearchParams()
  const focus = params.get('app')
  const { applications } = useScoped()
  const refs = React.useRef(new Map<string, HTMLDivElement>())
  const gated = applications
    .filter((item) => item.app.accessPolicy === 'subscription')
    .sort((a, b) => a.app.name.localeCompare(b.app.name))

  React.useEffect(() => {
    if (!focus) return
    refs.current.get(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        description="Subscriptions belong to your organization, never to a single user."
      />
      {gated.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt />}
            title="Nothing to subscribe to"
            description="Every application available to your organization is free for the workspace."
          />
        </Card>
      ) : (
        gated.map((item) => (
          <ApplicationSection
            key={item.app.id}
            item={item}
            highlighted={focus === item.app.id}
            sectionRef={(el) => {
              if (el) refs.current.set(item.app.id, el)
              else refs.current.delete(item.app.id)
            }}
          />
        ))
      )}
    </div>
  )
}
