import {
  buildInvoice,
  fmtIdr,
  fmtNumber,
  monthlyValue,
  newId,
  nextInvoiceNumber,
  priceFor,
} from '@scp/fixtures'
import { useFormat, useT, type Formatters, type Translate } from '@scp/i18n'
import type { BillingPeriod, Subscription, SubscriptionStatus } from '@scp/types'
import { BILLING_PERIODS } from '@scp/types'
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
  Chip,
  EmptyState,
  IconTile,
  PageHeader,
  StatCard,
  cn,
} from '@scp/ui'
import { AlertTriangle, CalendarClock, CheckCircle2, Receipt, Wallet } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { AppTypeIcon, SubscriptionBadge } from '../../components/badges'
import {
  ClearFiltersButton,
  FilterCombobox,
  enumOptions,
  useFilterParams,
  useNoMatches,
} from '../../components/filters'
import { actorOf, useScoped, type PortalApplication } from '../../state/app-state'
import { usePortalSheets } from '../../layouts/portal-sheets'
import { PaymentHistoryList } from './PaymentHistoryList'

const DAY = 86_400_000
const PERIOD_DAYS: Record<BillingPeriod, number> = { monthly: 30, annual: 365 }
const PERIOD_SUFFIX = { monthly: 'period.perMonth', annual: 'period.perYear' } as const
const PERIOD_LOWER = { monthly: 'period.monthlyLower', annual: 'period.annualLower' } as const

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
  t: Translate,
  { formatDate }: Formatters,
  pending: Exclude<Pending, null>,
  app: PortalApplication['app'],
  subscription: Subscription | null,
): { title: string; description: string } {
  if (pending.kind === 'cancel') {
    return {
      title: t('subscription.confirmCancel', { app: app.name }),
      description: t('subscription.confirmCancelDescription', {
        date: formatDate(subscription?.currentPeriodEnd),
      }),
    }
  }
  const price = `${fmtIdr(priceFor(app, pending.period), app.currency)} ${t(PERIOD_SUFFIX[pending.period])}`
  if (pending.kind === 'switch') {
    return {
      title: t('subscription.confirmSwitch', {
        app: app.name,
        period: t(PERIOD_LOWER[pending.period]),
      }),
      description: t('subscription.confirmSwitchDescription', { price }),
    }
  }
  if (!subscription && app.trialDays > 0)
    return {
      title: t('subscription.confirmTrial', { app: app.name }),
      description: t('subscription.confirmTrialDescription', { days: app.trialDays, price }),
    }
  return {
    title: t('subscription.confirmSubscribe', { app: app.name }),
    description: t('subscription.confirmSubscribeDescription', { price }),
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
  const t = useT()
  const format = useFormat()
  const { formatDate } = format
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
  const confirm = pending ? describePending(t, format, pending, app, subscription) : null

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
            ? t('subscription.renew')
            : app.trialDays > 0
              ? t('subscription.startTrial', { days: app.trialDays })
              : t('subscription.subscribe')}
        </Button>
      )
    }
    if (subscription.billingPeriod === period) {
      return (
        <Button variant="outline" size="sm" className="w-full" disabled>
          {t('common.current')}
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
        {t('subscription.switchTo', { period: t(PERIOD_LOWER[period]) })}
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
                  {t(`period.${subscription.billingPeriod}`)} ·{' '}
                  {fmtIdr(subscription.price, subscription.currency)}{' '}
                  {t(PERIOD_SUFFIX[subscription.billingPeriod])}
                </span>
              </>
            ) : (
              <>
                <Badge variant="muted">{t('common.notSubscribed')}</Badge>
                {app.trialDays > 0 ? (
                  <span className="text-muted text-xs">
                    {t('subscription.trialDays', { days: app.trialDays })}
                  </span>
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
            title={t('subscription.ready')}
            description={t('subscription.readyDescription')}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link to={`/users?app=${app.id}`}>{t('subscription.assignUsers')}</Link>
                </Button>
                {item.access.state === 'active' || item.access.state === 'trial' ? (
                  <Button size="sm" asChild>
                    <a href={app.baseUrl} target="_blank" rel="noreferrer">
                      {t('subscription.openApplication')}
                    </a>
                  </Button>
                ) : null}
                {outstanding && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/billing/${outstanding.id}`}>{t('common.viewInvoice')}</Link>
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
            title={t('subscription.accessSuspended')}
            description={t('subscription.accessSuspendedDescription')}
            action={
              <Button size="sm" variant="outline" onClick={openSupport}>
                {t('common.contactSupport')}
              </Button>
            }
          />
        )}
        {outstanding && !started && (
          <Banner
            icon={<Receipt />}
            tone="warning"
            title={t('subscription.outstandingInvoice')}
            description={t('subscription.outstandingInvoiceDescription')}
            action={
              <Button size="sm" asChild>
                <Link to={`/billing/${outstanding.id}/pay`}>{t('common.payInvoice')}</Link>
              </Button>
            }
          />
        )}
        {renewalInvoiced && (
          <p className="text-muted text-sm">{t('subscription.renewalInvoiced')}</p>
        )}
        {subscription?.scheduledChange && (
          <Banner
            icon={<Receipt />}
            tone="info"
            title={t('subscription.changeScheduled')}
            description={t('subscription.changeScheduledDescription', {
              period: t(`period.${subscription.scheduledChange.billingPeriod}`),
              price: fmtIdr(subscription.scheduledChange.price, subscription.currency),
              date: formatDate(subscription.scheduledChange.effectiveAt),
            })}
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={renewalInvoiced}
                onClick={() =>
                  dispatch({ type: 'subscriptions/cancelChange', id: subscription.id, actor })
                }
              >
                {t('subscription.keepCurrent')}
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
                    {t('subscription.currentPeriod')}
                  </p>
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">{t(`period.${period}`)}</p>
                    {price > 0 ? (
                      <p className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight tabular-nums">
                          {fmtIdr(price, app.currency)}
                        </span>
                        <span className="text-muted text-xs">{t(PERIOD_SUFFIX[period])}</span>
                      </p>
                    ) : (
                      <p className="text-muted mt-1 text-sm">{t('subscription.notOffered')}</p>
                    )}
                    {period === 'annual' && saving !== null ? (
                      <p className="text-muted mt-1 text-xs">
                        {t('subscription.saving', { percent: saving })}
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
                {t(cancelled ? 'subscription.ends' : 'subscription.renews', {
                  date: formatDate(subscription.currentPeriodEnd),
                })}
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
                  {t('subscription.reactivate')}
                </Button>
              ) : cancelled || ended ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => setPending({ kind: 'cancel' })}
                >
                  {t('subscription.cancelAtPeriodEnd')}
                </Button>
              )}
            </div>
            <PaymentHistoryList subscription={subscription} />
          </>
        ) : null}
        {!isAdmin ? <p className="text-muted text-xs">{t('subscription.adminsManage')}</p> : null}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('subscription.keepAsIs')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>
              {pending?.kind === 'cancel'
                ? t('subscription.cancelSubscription')
                : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

type View = 'all' | 'subscribed' | 'attention' | 'not_subscribed'
const VIEWS: View[] = ['all', 'subscribed', 'attention', 'not_subscribed']
const VIEW_STATUSES: Record<View, SubscriptionStatus[] | null> = {
  all: null,
  subscribed: ['active', 'trial', 'cancelled'],
  attention: ['past_due', 'grace_period', 'suspended', 'expired'],
  not_subscribed: [],
}
const SPENDING: SubscriptionStatus[] = ['active', 'past_due', 'grace_period']

function isView(value: string): value is View {
  return value in VIEW_STATUSES
}

function inView(view: View, subscription: Subscription | null): boolean {
  const statuses = VIEW_STATUSES[view]
  if (!statuses) return true
  if (!subscription || subscription.status === 'draft') return view === 'not_subscribed'
  return statuses.includes(subscription.status)
}

/** Blueprint §37: one subscription per application, owned by the organization rather than a single user. */
export function SubscriptionPage() {
  const t = useT()
  const { formatDate } = useFormat()
  const noMatches = useNoMatches()
  const [params] = useSearchParams()
  const focus = params.get('app')
  const { values, set, clear, active } = useFilterParams(['view', 'period'])
  const { applications, subscriptions, invoices, applicationsById } = useScoped()
  const refs = React.useRef(new Map<string, HTMLDivElement>())
  const view: View = isView(values.view) ? values.view : 'all'
  const gated = applications
    .filter((item) => item.app.accessPolicy === 'subscription')
    .sort((a, b) => a.app.name.localeCompare(b.app.name))
  const visible = gated.filter(
    (item) =>
      inView(view, item.subscription) &&
      (!values.period || item.subscription?.billingPeriod === values.period),
  )

  const monthlySpend = subscriptions
    .filter((s) => SPENDING.includes(s.status))
    .reduce((sum, s) => sum + monthlyValue(s), 0)
  const activeCount = subscriptions.filter((s) => s.status === 'active').length
  const nextRenewal = subscriptions
    .filter((s) => SPENDING.includes(s.status) || s.status === 'trial')
    .filter((s) => !s.cancelAtPeriodEnd && Date.parse(s.currentPeriodEnd) >= Date.now())
    .sort((a, b) => a.currentPeriodEnd.localeCompare(b.currentPeriodEnd))[0]
  const outstanding = invoices
    .filter((i) => i.status === 'open' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0)

  React.useEffect(() => {
    if (!focus) return
    refs.current.get(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.subscriptions')} description={t('subscription.description')} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('subscription.monthlySpend')}
          value={fmtIdr(monthlySpend)}
          hint={t('subscription.monthlySpendHint')}
          icon={<Wallet />}
          tone="ink"
        />
        <StatCard
          label={t('subscription.activeCount')}
          value={fmtNumber(activeCount)}
          hint={t('subscription.activeCountHint')}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label={t('subscription.nextRenewal')}
          value={nextRenewal ? formatDate(nextRenewal.currentPeriodEnd) : t('common.none')}
          hint={
            nextRenewal
              ? (applicationsById.get(nextRenewal.applicationId)?.name ?? nextRenewal.applicationId)
              : t('subscription.noRenewal')
          }
          icon={<CalendarClock />}
          tone="info"
        />
        <StatCard
          label={t('subscription.outstanding')}
          value={fmtIdr(outstanding)}
          hint={t('subscription.outstandingHint')}
          icon={<AlertTriangle />}
          tone="danger"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <Chip key={v} active={view === v} activeTone="ink" onClick={() => set('view', v)}>
            {t(`subscription.view.${v}`)}
          </Chip>
        ))}
        <FilterCombobox
          value={values.period}
          onChange={(v) => set('period', v)}
          options={enumOptions(BILLING_PERIODS, (p) => t(`period.${p}`))}
          allLabel={t('subscription.allPeriods')}
          searchPlaceholder={t('subscription.searchPeriods')}
        />
        {active ? <ClearFiltersButton onClick={clear} /> : null}
      </div>
      {gated.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt />}
            title={t('subscription.nothingToSubscribe')}
            description={t('subscription.nothingToSubscribeDescription')}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState {...noMatches(clear)} />
        </Card>
      ) : (
        visible.map((item) => (
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
