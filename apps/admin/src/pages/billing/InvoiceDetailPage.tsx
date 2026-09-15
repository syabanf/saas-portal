import { fmtDate, fmtDateTime, fmtIdr, invoiceSubtotal, invoiceTax } from '@scp/fixtures'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID, PAYMENT_METHOD_LABEL } from '@scp/types'
import {
  Badge,
  Banner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  KeyValue,
  pushToast,
} from '@scp/ui'
import { Ban, CheckCircle2, Clock, CreditCard, FileText, Zap } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, SubscriptionBadge } from '../../components/badges'
import { useScoped } from '../../state/app-state'
import { SimulatePaymentConfirm } from './SimulatePaymentConfirm'

/** Blueprint §42: the invoice a customer is asked to pay, with the access deadline next to it. */
export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { invoicesById, tenantsById, subscriptionsById, applicationsById, payments, dispatch } =
    useScoped()
  const invoice = invoicesById.get(id)
  const [confirming, setConfirming] = React.useState(false)
  const [justPaid, setJustPaid] = React.useState(false)

  const invoicePayments = React.useMemo(
    () =>
      payments
        .filter((p) => p.invoiceId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments, id],
  )
  const pendingPayment = invoicePayments.find((p) => p.status === 'pending')

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Card>
          <EmptyState
            title="Invoice not found"
            description="It may have been deleted."
            action={
              <Button variant="outline" onClick={() => navigate('/billing')}>
                Back to billing
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const tenant = tenantsById.get(invoice.tenantId)
  const subscription = subscriptionsById.get(invoice.subscriptionId)
  const application = subscription ? applicationsById.get(subscription.applicationId) : undefined
  const payable = invoice.status === 'open' || invoice.status === 'overdue'
  const voidable = invoice.status === 'open' || invoice.status === 'draft'
  const accessUntil = subscription
    ? (subscription.gracePeriodEnd ?? subscription.currentPeriodEnd)
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{invoice.number}</h1>
            <InvoiceBadge status={invoice.status} />
          </div>
          <p className="text-muted mt-1 text-sm">
            <Link
              to={`/organizations/${invoice.tenantId}`}
              className="text-foreground font-medium hover:underline"
            >
              {tenant?.name ?? invoice.tenantId}
            </Link>
            {' · '}
            {fmtIdr(invoice.total, invoice.currency)} due {fmtDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payable ? (
            <Button onClick={() => setConfirming(true)}>
              <Zap /> Settle with Xendit (demo)
            </Button>
          ) : null}
          {voidable ? (
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: 'invoices/upsert', invoice: { ...invoice, status: 'void' } })
                pushToast({ title: `${invoice.number} voided` })
              }}
            >
              <Ban /> Void
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to={`/billing/${invoice.id}/document`}>
              <FileText /> View document
            </Link>
          </Button>
        </div>
      </div>

      {pendingPayment ? (
        <Banner
          tone="warning"
          icon={<Clock />}
          title={`Waiting for ${PAYMENT_CHANNEL_BY_ID[pendingPayment.channel].label} payment · expires ${fmtDateTime(pendingPayment.expiresAt)}`}
          description="Xendit will call the backend webhook once the customer pays."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to={`/payments/${pendingPayment.id}`}>View payment</Link>
            </Button>
          }
        />
      ) : null}

      {justPaid && invoice.status === 'paid' ? (
        <Banner
          tone="success"
          icon={<CheckCircle2 />}
          title="Payment received."
          description="Subscription is Active and the connected application was notified."
          onDismiss={() => setJustPaid(false)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border text-muted border-b text-xs font-semibold tracking-wide uppercase">
                      <th className="h-10 text-left">Description</th>
                      <th className="h-10 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, i) => (
                      <tr key={i} className="border-border border-b">
                        <td className="py-3">{line.description}</td>
                        <td className="py-3 text-right tabular-nums">
                          {fmtIdr(line.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                    <tr className="text-muted">
                      <td className="pt-3 pb-1">Period</td>
                      <td className="pt-3 pb-1 text-right">
                        {fmtDate(invoice.periodStart)} to {fmtDate(invoice.periodEnd)}
                      </td>
                    </tr>
                    <tr className="text-muted">
                      <td className="py-1">Subtotal</td>
                      <td className="py-1 text-right tabular-nums">
                        {fmtIdr(invoiceSubtotal(invoice), invoice.currency)}
                      </td>
                    </tr>
                    <tr className="text-muted">
                      <td className="py-1">PPN {Math.round(invoice.taxRate * 100)}%</td>
                      <td className="py-1 text-right tabular-nums">
                        {fmtIdr(invoiceTax(invoice), invoice.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="pt-2 pb-3 font-semibold">Total</td>
                      <td className="pt-2 pb-3 text-right text-base font-extrabold tabular-nums">
                        {fmtIdr(invoice.total, invoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Payments <Badge variant="muted">{invoicePayments.length}</Badge>
              </CardTitle>
              <CardDescription>Xendit payment requests attached to this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoicePayments.length === 0 ? (
                <EmptyState
                  icon={<CreditCard />}
                  title="No payments yet"
                  description={
                    payable
                      ? 'Settle the invoice through Xendit to see the payment record and the subscription reactivate.'
                      : 'This invoice has no payment attempts.'
                  }
                  action={
                    payable ? (
                      <Button size="sm" onClick={() => setConfirming(true)}>
                        Settle with Xendit (demo)
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                invoicePayments.map((p) => (
                  <Link
                    key={p.id}
                    to={`/payments/${p.id}`}
                    className="bg-surface-2 hover:bg-surface flex flex-wrap items-center gap-3 rounded-2xl p-3"
                  >
                    <div className="min-w-0">
                      <Mono className="font-semibold">{p.providerReference}</Mono>
                      <p className="text-sm">
                        {PAYMENT_CHANNEL_BY_ID[p.channel].label}{' '}
                        <span className="text-muted text-xs">{PAYMENT_METHOD_LABEL[p.method]}</span>
                      </p>
                    </div>
                    <span className="ml-auto text-sm font-semibold tabular-nums">
                      {fmtIdr(p.amount, p.currency)}
                    </span>
                    <PaymentBadge status={p.status} />
                    <span className="text-muted w-full text-xs sm:w-auto">
                      {p.paidAt
                        ? `Paid ${fmtDateTime(p.paidAt)}`
                        : `Created ${fmtDateTime(p.createdAt)}`}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  { label: 'Issued', value: fmtDate(invoice.issuedAt) },
                  { label: 'Due', value: fmtDate(invoice.dueDate) },
                  { label: 'Paid at', value: invoice.paidAt ? fmtDateTime(invoice.paidAt) : '—' },
                  {
                    label: 'Subscription',
                    value: subscription ? (
                      <Link
                        to={`/subscriptions/${subscription.id}`}
                        className="font-medium hover:underline"
                      >
                        <Mono>{subscription.id}</Mono>
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  { label: 'Status', value: <InvoiceBadge status={invoice.status} /> },
                ]}
              />
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
                      {BILLING_PERIOD_LABEL[invoice.billingPeriod ?? subscription.billingPeriod]}
                    </span>
                    <SubscriptionBadge status={subscription.status} />
                  </div>
                  <div className="bg-surface-2 rounded-2xl p-3">
                    <p className="text-muted text-xs">Access until</p>
                    <p className="text-base font-bold">{fmtDate(accessUntil)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/subscriptions/${subscription.id}`}>Open subscription</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-muted text-sm">
                  The subscription behind this invoice no longer exists.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SimulatePaymentConfirm
        invoice={confirming ? invoice : null}
        onOpenChange={setConfirming}
        onDone={() => setJustPaid(true)}
      />
    </div>
  )
}
