import { fmtDate, fmtDateTime, fmtIdr, invoiceSubtotal, invoiceTax } from '@scp/fixtures'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  KeyValue,
} from '@scp/ui'
import { Check, Clock, FileText } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, SubscriptionBadge } from '../../components/badges'
import { useScoped } from '../../state/app-state'

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const { invoicesById, payments, subscriptionsById, applicationsById } = useScoped()
  const invoice = invoicesById.get(id)

  if (!invoice) {
    return (
      <Card>
        <EmptyState
          icon={<FileText />}
          title="Invoice not found"
          description="It may belong to another organization or has been removed."
          action={
            <Button variant="outline" asChild>
              <Link to="/billing">Back to billing</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  const sub = subscriptionsById.get(invoice.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const payable = invoice.status === 'open' || invoice.status === 'overdue'
  const invoicePayments = payments
    .filter((p) => p.invoiceId === invoice.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pendingPayment = payable ? invoicePayments.find((p) => p.status === 'pending') : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{invoice.number}</h1>
          <InvoiceBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={`/billing/${invoice.id}/document`}>
              <FileText /> View invoice
            </Link>
          </Button>
          {payable ? (
            <Button asChild>
              <Link to={`/billing/${invoice.id}/pay`}>Pay invoice</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {pendingPayment ? (
        <Banner
          tone="warning"
          icon={<Clock />}
          title={`Waiting for ${PAYMENT_CHANNEL_BY_ID[pendingPayment.channel].label} payment.`}
          description={
            pendingPayment.expiresAt
              ? `Expires ${fmtDateTime(pendingPayment.expiresAt)}`
              : undefined
          }
          action={
            <Button size="sm" asChild>
              <Link to={`/payments/${pendingPayment.id}`}>View instructions</Link>
            </Button>
          }
        />
      ) : null}

      {invoice.status === 'paid' ? (
        <Card className="bg-success-soft shadow-none">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <span className="bg-card text-success flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5">
              <Check />
            </span>
            <div className="min-w-[12rem] flex-1">
              <p className="text-sm font-semibold">
                Paid {fmtDateTime(invoice.paidAt)}.{' '}
                {app ? `The ${app.name} subscription` : 'The subscription'} is Active.
              </p>
              <p className="text-muted text-xs">Users can open the application straight away.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {app ? (
                <Button size="sm" asChild>
                  <a href={app.baseUrl} target="_blank" rel="noreferrer">
                    Open {app.name}
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <Link to="/billing">Back to billing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={[
                { label: 'Issued', value: fmtDate(invoice.issuedAt) },
                { label: 'Due', value: fmtDate(invoice.dueDate) },
                {
                  label: 'Period',
                  value: `${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`,
                },
                {
                  label: 'Paid at',
                  value: invoice.paidAt ? fmtDateTime(invoice.paidAt) : 'Not yet',
                },
                {
                  label: 'Subscription',
                  value: sub ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {app?.name ?? sub.applicationId} ·{' '}
                      {BILLING_PERIOD_LABEL[invoice.billingPeriod ?? sub.billingPeriod]}{' '}
                      <SubscriptionBadge status={sub.status} />
                    </span>
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'Access until',
                  value: fmtDate(sub?.gracePeriodEnd ?? sub?.currentPeriodEnd),
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-border divide-y text-sm">
              {invoice.lines.map((line, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{line.description}</span>
                  <span className="tabular-nums">{fmtIdr(line.amount, invoice.currency)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted">Subtotal</span>
                <span className="tabular-nums">
                  {fmtIdr(invoiceSubtotal(invoice), invoice.currency)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted">PPN {Math.round(invoice.taxRate * 100)}%</span>
                <span className="tabular-nums">
                  {fmtIdr(invoiceTax(invoice), invoice.currency)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-3 font-semibold">
                <span>Total</span>
                <span className="text-lg tabular-nums">
                  {fmtIdr(invoice.total, invoice.currency)}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments for this invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicePayments.length === 0 ? (
            <p className="text-muted text-sm">No payment recorded yet.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {invoicePayments.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/payments/${p.id}`}
                    className="hover:bg-surface -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                  >
                    <span className="font-semibold">{PAYMENT_CHANNEL_BY_ID[p.channel].label}</span>
                    <Mono>{p.providerReference}</Mono>
                    <span className="tabular-nums">{fmtIdr(p.amount + p.fee, p.currency)}</span>
                    <PaymentBadge status={p.status} />
                    <span className="text-muted ml-auto text-xs">
                      {fmtDateTime(p.paidAt ?? p.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
