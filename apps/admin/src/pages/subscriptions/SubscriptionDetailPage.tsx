import { fmtDate, fmtDateTime, fmtDaysUntil, fmtIdr, needsRenewalInvoice } from '@scp/fixtures'
import type { EventType, Invoice, Payment, SubscriptionStatus } from '@scp/types'
import {
  BILLING_PERIOD_LABEL,
  PAYMENT_CHANNEL_BY_ID,
  PAYMENT_METHOD_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  ConfirmDelete,
  DataTable,
  EmptyState,
  KeyValue,
  Label,
  Timeline,
  type Column,
  type TimelineItem,
} from '@scp/ui'
import {
  ArrowLeftRight,
  Ban,
  CreditCard,
  FilePlus2,
  FileText,
  RotateCcw,
  Trash2,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { InvoiceBadge, Mono, PaymentBadge, SubscriptionBadge } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { labelOptions } from '../../lib/options'
import { SimulatePaymentConfirm } from '../billing/SimulatePaymentConfirm'
import { AccessPolicyCard } from './AccessPolicyCard'
import { ChangePeriodDialog } from './ChangePeriodDialog'

function eventTone(type: EventType): TimelineItem['tone'] {
  switch (type) {
    case 'subscription.activated':
    case 'subscription.renewed':
    case 'payment.success':
      return 'success'
    case 'subscription.past_due':
    case 'subscription.grace_started':
      return 'warning'
    case 'subscription.suspended':
    case 'subscription.expired':
      return 'accent'
    case 'subscription.cancelled':
      return 'default'
    default:
      return 'info'
  }
}

export function SubscriptionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const {
    subscriptionsById,
    tenantsById,
    applicationsById,
    eventsBySubscription,
    invoices,
    invoicesById,
    payments,
    dispatch,
  } = useScoped()
  const subscription = subscriptionsById.get(id)

  const [changingPeriod, setChangingPeriod] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [paying, setPaying] = React.useState<Invoice | null>(null)

  const events = React.useMemo(
    () => (eventsBySubscription.get(id) ?? []).slice().sort((a, b) => a.at.localeCompare(b.at)),
    [eventsBySubscription, id],
  )
  const subInvoices = React.useMemo(
    () =>
      invoices
        .filter((i) => i.subscriptionId === id)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [invoices, id],
  )
  const subPayments = React.useMemo(
    () =>
      payments
        .filter((p) => p.subscriptionId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments, id],
  )

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'ref',
      header: 'Xendit id',
      cell: (p) => (
        <Link to={`/payments/${p.id}`} className="hover:underline">
          <Mono className="font-semibold">{p.providerReference}</Mono>
        </Link>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice',
      cell: (p) => {
        const invoice = p.invoiceId ? invoicesById.get(p.invoiceId) : undefined
        return invoice ? (
          <Link to={`/billing/${invoice.id}`} className="hover:underline">
            <Mono>{invoice.number}</Mono>
          </Link>
        ) : (
          <Mono className="text-muted">{p.externalId}</Mono>
        )
      },
    },
    {
      key: 'channel',
      header: 'Channel',
      cell: (p) => (
        <div>
          <p className="font-medium">{PAYMENT_CHANNEL_BY_ID[p.channel].label}</p>
          <p className="text-muted text-xs">{PAYMENT_METHOD_LABEL[p.method]}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <div className="tabular-nums">
          <p className="font-semibold">{fmtIdr(p.amount, p.currency)}</p>
          <p className="text-muted text-xs">Fee {fmtIdr(p.fee, p.currency)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (p) => <PaymentBadge status={p.status} /> },
    { key: 'created', header: 'Created', cell: (p) => fmtDateTime(p.createdAt) },
    {
      key: 'settled',
      header: 'Paid / expires',
      cell: (p) => {
        if (p.status === 'success') return fmtDateTime(p.paidAt)
        if (p.status === 'expired') return `Expired ${fmtDateTime(p.expiresAt)}`
        if (p.status === 'pending' && p.expiresAt) return `Expires ${fmtDateTime(p.expiresAt)}`
        return <span className="text-muted">—</span>
      },
    },
  ]

  if (!subscription) {
    return (
      <div className="space-y-4">
        <Card>
          <EmptyState
            title="Subscription not found"
            description="It may have been deleted."
            action={
              <Button variant="outline" onClick={() => navigate('/subscriptions')}>
                Back to subscriptions
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const tenant = tenantsById.get(subscription.tenantId)
  const application = applicationsById.get(subscription.applicationId)
  const appName = application?.name ?? subscription.applicationId
  const perUnit = subscription.billingPeriod === 'annual' ? 'year' : 'month'
  const actor = actorOf(user)
  const now = Date.now()
  const canRenew = needsRenewalInvoice(subscription, invoices)
  const billable = !['draft', 'cancelled', 'expired'].includes(subscription.status)
  const renewHint = canRenew
    ? undefined
    : billable
      ? 'Next period already invoiced'
      : `No renewal for a ${SUBSCRIPTION_STATUS_LABEL[subscription.status].toLowerCase()} subscription`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/organizations/${subscription.tenantId}`}
              className="text-2xl font-bold tracking-tight hover:underline"
            >
              {tenant?.name ?? subscription.tenantId}
            </Link>
            <SubscriptionBadge status={subscription.status} />
          </div>
          <p className="text-muted mt-1 text-sm">
            <Link
              to={`/applications/${subscription.applicationId}`}
              className="text-foreground font-medium hover:underline"
            >
              {appName}
            </Link>
            {' · '}
            {BILLING_PERIOD_LABEL[subscription.billingPeriod]} ·{' '}
            {fmtIdr(subscription.price, subscription.currency)} / {perUnit}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="subscription-status" className="text-muted text-xs">
              Status
            </Label>
            <Combobox
              id="subscription-status"
              value={subscription.status}
              onChange={(v) =>
                dispatch({
                  type: 'subscriptions/setStatus',
                  id: subscription.id,
                  status: v as SubscriptionStatus,
                  actor,
                })
              }
              options={labelOptions(SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABEL)}
              className="w-44"
            />
          </div>
          <Button variant="outline" onClick={() => setChangingPeriod(true)}>
            <ArrowLeftRight /> Change billing period
          </Button>
          {subscription.status === 'active' || subscription.status === 'trial' ? (
            <Button variant="outline" onClick={() => setCancelling(true)}>
              <Ban /> Cancel
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() =>
                dispatch({ type: 'subscriptions/reactivate', id: subscription.id, actor })
              }
            >
              <RotateCcw /> Reactivate
            </Button>
          )}
          <Button variant="outline" className="text-danger" onClick={() => setRemoving(true)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={[
                { label: 'ID', value: <Mono>{subscription.id}</Mono> },
                ...(subscription.scheduledChange
                  ? [
                      {
                        label: 'Scheduled billing',
                        value: (
                          <span>
                            {BILLING_PERIOD_LABEL[subscription.scheduledChange.billingPeriod]} ·{' '}
                            {fmtIdr(subscription.scheduledChange.price, subscription.currency)} from{' '}
                            {fmtDate(subscription.scheduledChange.effectiveAt)}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  label: 'Organization',
                  value: (
                    <Link
                      to={`/organizations/${subscription.tenantId}`}
                      className="font-medium hover:underline"
                    >
                      {tenant?.name ?? subscription.tenantId}
                    </Link>
                  ),
                },
                {
                  label: 'Application',
                  value: (
                    <Link
                      to={`/applications/${subscription.applicationId}`}
                      className="font-medium hover:underline"
                    >
                      {appName}
                    </Link>
                  ),
                },
                {
                  label: 'Billing period',
                  value: BILLING_PERIOD_LABEL[subscription.billingPeriod],
                },
                {
                  label: 'Price',
                  value: (
                    <span className="tabular-nums">
                      {fmtIdr(subscription.price, subscription.currency)} / {perUnit}
                    </span>
                  ),
                },
                { label: 'Status', value: <SubscriptionBadge status={subscription.status} /> },
                { label: 'Started', value: fmtDate(subscription.startedAt) },
                {
                  label: 'Current period',
                  value: `${fmtDate(subscription.currentPeriodStart)} → ${fmtDate(subscription.currentPeriodEnd)}`,
                },
                {
                  label: 'Grace ends',
                  value: subscription.gracePeriodEnd
                    ? `${fmtDate(subscription.gracePeriodEnd)} · ${fmtDaysUntil(subscription.gracePeriodEnd, now)}`
                    : '—',
                },
                { label: 'Cancel at end', value: subscription.cancelAtPeriodEnd ? 'Yes' : 'No' },
                { label: 'Updated', value: fmtDateTime(subscription.updatedAt) },
              ]}
            />
          </CardContent>
        </Card>

        <AccessPolicyCard subscription={subscription} application={application} />

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>
              Every lifecycle and payment event of this subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                title="No events yet"
                description="Status changes and payments show up here."
              />
            ) : (
              <Timeline
                items={events.map((e) => ({
                  id: e.id,
                  when: fmtDate(e.at),
                  title: e.label,
                  note: e.note,
                  tone: eventTone(e.type),
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Paying an open invoice reactivates the subscription.
              </CardDescription>
            </div>
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                disabled={!canRenew}
                title={renewHint}
                onClick={() =>
                  dispatch({ type: 'invoices/generate', subscriptionId: subscription.id, actor })
                }
              >
                <FilePlus2 /> Generate renewal invoice
              </Button>
              {renewHint ? <p className="text-muted mt-1 text-xs">{renewHint}</p> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {subInvoices.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No invoices"
                description="Invoices are created from Billing."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/billing">Open billing</Link>
                  </Button>
                }
              />
            ) : (
              subInvoices.map((inv) => (
                <div key={inv.id} className="bg-surface-2 rounded-2xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/billing/${inv.id}`}
                      className="font-mono text-xs font-semibold hover:underline"
                    >
                      {inv.number}
                    </Link>
                    <InvoiceBadge status={inv.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold tabular-nums">
                      {fmtIdr(inv.total, inv.currency)}
                    </span>
                    <span className="text-muted text-xs">Due {fmtDate(inv.dueDate)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link to={`/billing/${inv.id}/document`}>
                        <FileText /> Document
                      </Link>
                    </Button>
                    {inv.status === 'open' || inv.status === 'overdue' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => setPaying(inv)}
                      >
                        <Zap /> Settle with Xendit (demo)
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>
              Every Xendit payment request raised for this subscription, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={subPayments}
              columns={paymentColumns}
              rowKey={(p) => p.id}
              pageSize={5}
              empty={{
                icon: <CreditCard />,
                title: 'No payments yet',
                description: 'Settling an invoice creates a payment request here.',
              }}
            />
          </CardContent>
        </Card>
      </div>

      <ChangePeriodDialog
        subscription={changingPeriod ? subscription : null}
        onOpenChange={setChangingPeriod}
      />
      <SimulatePaymentConfirm
        invoice={paying}
        onOpenChange={(open) => (open ? undefined : setPaying(null))}
      />
      <AlertDialog open={cancelling} onOpenChange={setCancelling}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Access continues until {fmtDate(subscription.currentPeriodEnd)}. After that the
              organization is denied entry to {appName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dispatch({ type: 'subscriptions/cancel', id: subscription.id, actor })}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDelete
        open={removing}
        onOpenChange={setRemoving}
        title="Delete subscription?"
        description={`${tenant?.name ?? 'The organization'} loses access to ${appName} immediately. Its invoices and payments are removed too.`}
        onConfirm={() => {
          dispatch({ type: 'subscriptions/remove', id: subscription.id })
          navigate('/subscriptions')
        }}
      />
    </div>
  )
}
