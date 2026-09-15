import { fmtDate, fmtDateTime, fmtIdr, receiptNumber } from '@scp/fixtures'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID, PAYMENT_METHOD_LABEL } from '@scp/types'
import { Button, Card, EmptyState, ReceiptDocument, type InvoiceParty } from '@scp/ui'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useScoped } from '../../state/app-state'

const PAYEE: InvoiceParty = {
  name: 'SaaS Gate Platform',
  lines: [
    'PT WIT Teknologi Indonesia',
    'Jl. Contoh No. 1, Jakarta 12345',
    'billing@saasgate.example',
    'NPWP 00.000.000.0-000.000',
  ],
}

/** Printable receipt for a settled payment, rendered without the portal shell. */
export function ReceiptDocumentPage() {
  const { paymentId = '' } = useParams()
  const { payments, invoicesById, subscriptionsById, applicationsById, tenant } = useScoped()
  const payment = payments.find((p) => p.id === paymentId)

  if (!payment || payment.status !== 'success') {
    return (
      <div className="bg-surface min-h-dvh p-4">
        <Card className="mx-auto max-w-[210mm]">
          <EmptyState
            icon={<FileText />}
            title={payment ? 'No receipt yet' : 'Payment not found'}
            description={
              payment
                ? 'A receipt is issued once the payment is settled.'
                : 'It may belong to another organization or has been removed.'
            }
            action={
              <Button variant="outline" asChild>
                <Link to={payment ? `/payments/${payment.id}` : '/billing'}>
                  {payment ? 'Back to payment' : 'Back to billing'}
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const invoice = payment.invoiceId ? invoicesById.get(payment.invoiceId) : undefined
  const sub = subscriptionsById.get(payment.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const money = (amount: number) => fmtIdr(amount, payment.currency)
  const channel = PAYMENT_CHANNEL_BY_ID[payment.channel]

  return (
    <div className="bg-surface print-root min-h-dvh p-4">
      <div className="print-hidden mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card shadow-card rounded-full"
          aria-label="Back to payment"
          asChild
        >
          <Link to={`/payments/${payment.id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-[10rem] flex-1 truncate text-lg font-bold tracking-tight">
          Receipt {receiptNumber(payment)}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Download PDF
          </Button>
          {invoice ? (
            <Button variant="outline" asChild>
              <Link to={`/billing/${invoice.id}/document`}>View invoice</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ReceiptDocument
        number={receiptNumber(payment)}
        paidAt={fmtDateTime(payment.paidAt)}
        total={money(payment.amount + payment.fee)}
        payee={PAYEE}
        payer={{
          name: tenant?.name ?? 'Your organization',
          lines: tenant ? [tenant.billingEmail, tenant.country] : [],
        }}
        items={[
          { label: 'Invoice', value: invoice?.number ?? payment.externalId },
          ...(app && sub
            ? [
                {
                  label: 'Subscription',
                  value: `${app.name} · ${BILLING_PERIOD_LABEL[sub.billingPeriod]}`,
                },
              ]
            : []),
          ...(invoice
            ? [
                {
                  label: 'Period',
                  value: `${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`,
                },
              ]
            : []),
        ]}
        amounts={[
          { label: 'Invoice amount', value: money(payment.amount) },
          { label: 'Provider fee', value: money(payment.fee) },
          { label: 'Total charged', value: money(payment.amount + payment.fee) },
        ]}
        paymentRows={[
          { label: 'Xendit id', value: payment.providerReference },
          { label: 'External id', value: payment.externalId },
          { label: 'Method', value: PAYMENT_METHOD_LABEL[payment.method] },
          { label: 'Channel', value: channel.label },
        ]}
        notes={[
          'This receipt confirms a payment processed by Xendit on behalf of SaaS Gate Platform.',
          'Questions about this payment: billing@saasgate.example.',
        ]}
      />
    </div>
  )
}
