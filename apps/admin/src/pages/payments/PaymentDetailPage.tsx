import { fmtDate, fmtDateTime, fmtIdr } from '@scp/fixtures'
import type { Payment, PaymentEventType, PaymentStatus } from '@scp/types'
import {
  BILLING_PERIOD_LABEL,
  PAYMENT_CHANNEL_BY_ID,
  PAYMENT_EVENT_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@scp/types'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeBlock,
  EmptyState,
  KeyValue,
  Timeline,
  type KeyValueRow,
  type TimelineItem,
} from '@scp/ui'
import { Check, Copy, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { InvoiceBadge, Mono, PaymentBadge, SubscriptionBadge } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { PENDING_TRANSITIONS, RefundPaymentDialog } from './PaymentActions'

const EVENT_TONE: Partial<Record<PaymentEventType, TimelineItem['tone']>> = {
  paid: 'success',
  expired: 'accent',
  failed: 'accent',
  callback: 'info',
}

/** Xendit invoice statuses; a refund is a separate object there, so the invoice stays PAID. */
const XENDIT_STATUS: Record<PaymentStatus, string> = {
  pending: 'PENDING',
  success: 'PAID',
  failed: 'FAILED',
  expired: 'EXPIRED',
  refunded: 'PAID',
}

function webhookPayload(p: Payment): string {
  return JSON.stringify(
    {
      id: p.providerReference,
      external_id: p.externalId,
      status: XENDIT_STATUS[p.status],
      amount: p.amount,
      fees_paid_amount: p.fee,
      payment_method: p.method.toUpperCase(),
      payment_channel: p.channel,
      paid_at: p.paidAt,
      created: p.createdAt,
      expiry_date: p.expiresAt,
    },
    null,
    2,
  )
}

function instructionRows(p: Payment): KeyValueRow[] {
  const { accountNumber, paymentCode, qrString, checkoutUrl, cardLast4 } = p.instructions
  switch (p.method) {
    case 'virtual_account':
      return [{ label: 'Virtual account number', value: <Mono>{accountNumber}</Mono> }]
    case 'retail':
      return [{ label: 'Payment code', value: <Mono>{paymentCode}</Mono> }]
    case 'qris':
      return [
        {
          label: 'QR string',
          value: (
            <span className="block max-w-56 truncate" title={qrString ?? undefined}>
              <Mono>{qrString}</Mono>
            </span>
          ),
        },
      ]
    case 'ewallet':
      return [{ label: 'Checkout URL', value: <Mono className="break-all">{checkoutUrl}</Mono> }]
    case 'card':
      return [{ label: 'Card', value: <Mono>•••• {cardLast4}</Mono> }]
  }
}

/** One Xendit payment request: what the customer was told, what came back, and the records it touched. */
export function PaymentDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { payments, tenantsById, invoicesById, subscriptionsById, applicationsById, dispatch } =
    useScoped()
  const payment = payments.find((p) => p.id === id)
  const [refunding, setRefunding] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  if (!payment) {
    return (
      <div className="space-y-4">
        <Card>
          <EmptyState
            title="Payment not found"
            description="It may have been removed."
            action={
              <Button variant="outline" onClick={() => navigate('/payments')}>
                Back to payments
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const tenant = tenantsById.get(payment.tenantId)
  const invoice = payment.invoiceId ? invoicesById.get(payment.invoiceId) : undefined
  const subscription = subscriptionsById.get(payment.subscriptionId)
  const application = subscription ? applicationsById.get(subscription.applicationId) : undefined
  const channel = PAYMENT_CHANNEL_BY_ID[payment.channel]
  const actor = actorOf(user)
  const reference = payment.providerReference

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const timeline: TimelineItem[] = payment.events.map((e, i) => ({
    id: `${e.at}-${i}`,
    when: fmtDateTime(e.at),
    title: PAYMENT_EVENT_LABEL[e.type],
    note: e.note,
    tone: EVENT_TONE[e.type] ?? 'default',
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-bold tracking-tight break-all">
              {payment.providerReference}
            </h1>
            <PaymentBadge status={payment.status} />
          </div>
          <p className="text-muted mt-1 text-sm">
            <Link
              to={`/organizations/${payment.tenantId}`}
              className="text-foreground font-medium hover:underline"
            >
              {tenant?.name ?? payment.tenantId}
            </Link>
            {invoice ? (
              <>
                {' · '}
                <Link to={`/billing/${invoice.id}`} className="hover:underline">
                  <Mono>{invoice.number}</Mono>
                </Link>
              </>
            ) : null}
            {' · '}
            {channel.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payment.status === 'pending'
            ? PENDING_TRANSITIONS.map((t, i) => (
                <Button
                  key={t.status}
                  variant={i === 0 ? 'primary' : 'outline'}
                  onClick={() =>
                    dispatch({
                      type: 'payments/setStatus',
                      id: payment.id,
                      status: t.status,
                      actor,
                    })
                  }
                >
                  <t.icon /> {t.label}
                </Button>
              ))
            : null}
          {payment.status === 'success' ? (
            <Button variant="outline" className="text-danger" onClick={() => setRefunding(true)}>
              <RotateCcw /> Refund
            </Button>
          ) : null}
          <Button variant="ghost" onClick={copyReference}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy Xendit id'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Every step Xendit and the backend recorded for this request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline items={timeline} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions sent to the customer</CardTitle>
              <CardDescription>
                {channel.label} · {PAYMENT_METHOD_LABEL[payment.method]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeyValue dense rows={instructionRows(payment)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook payload</CardTitle>
              <CardDescription>
                Illustrative payload; the backend receives the real callback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={webhookPayload(payment)} language="json" title="invoice.callback" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  {
                    label: 'Xendit id',
                    value: <Mono className="break-all">{payment.providerReference}</Mono>,
                  },
                  { label: 'External id', value: <Mono>{payment.externalId}</Mono> },
                  { label: 'Method', value: PAYMENT_METHOD_LABEL[payment.method] },
                  { label: 'Channel', value: channel.label },
                  { label: 'Amount', value: fmtIdr(payment.amount, payment.currency) },
                  { label: 'Fee', value: fmtIdr(payment.fee, payment.currency) },
                  { label: 'Total', value: fmtIdr(payment.amount + payment.fee, payment.currency) },
                  { label: 'Currency', value: payment.currency },
                  { label: 'Created', value: fmtDateTime(payment.createdAt) },
                  { label: 'Expires', value: fmtDateTime(payment.expiresAt) },
                  { label: 'Paid at', value: fmtDateTime(payment.paidAt) },
                  { label: 'Status', value: <PaymentBadge status={payment.status} /> },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Mono className="font-semibold">{invoice.number}</Mono>
                    <InvoiceBadge status={invoice.status} />
                  </div>
                  <div className="bg-surface-2 rounded-2xl p-3">
                    <p className="text-muted text-xs">Total · due {fmtDate(invoice.dueDate)}</p>
                    <p className="text-base font-bold">{fmtIdr(invoice.total, invoice.currency)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/billing/${invoice.id}`}>Open invoice</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted text-sm">This payment is not attached to an invoice.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {application?.name ?? subscription.applicationId} ·{' '}
                      {BILLING_PERIOD_LABEL[subscription.billingPeriod]}
                    </span>
                    <SubscriptionBadge status={subscription.status} />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/subscriptions/${subscription.id}`}>Open subscription</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted text-sm">
                  The subscription behind this payment no longer exists.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RefundPaymentDialog payment={refunding ? payment : null} onOpenChange={setRefunding} />
    </div>
  )
}
