import { fmtDate, fmtDateTime, fmtIdr, invoiceSubtotal, invoiceTax } from '@scp/fixtures'
import type { Invoice, InvoiceStatus, Payment } from '@scp/types'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import { Button, Card, EmptyState, InvoiceDocument, type InvoiceDocumentProps } from '@scp/ui'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useScoped } from '../../state/app-state'

const SELLER: InvoiceDocumentProps['seller'] = {
  name: 'SaaS Gate Platform',
  lines: [
    'PT WIT Teknologi Indonesia',
    'Jl. Contoh No. 1, Jakarta 12345',
    'billing@saasgate.example',
    'NPWP 00.000.000.0-000.000',
  ],
}

const STAMP: Record<InvoiceStatus, Pick<InvoiceDocumentProps, 'stamp' | 'stampTone'>> = {
  paid: { stamp: 'PAID', stampTone: 'success' },
  open: { stamp: 'UNPAID', stampTone: 'warning' },
  overdue: { stamp: 'OVERDUE', stampTone: 'danger' },
  draft: { stamp: 'DRAFT', stampTone: 'muted' },
  void: { stamp: 'VOID', stampTone: 'muted' },
}

type PaymentRow = { label: string; value: string }

function instructionRow(payment: Payment): PaymentRow {
  const channel = PAYMENT_CHANNEL_BY_ID[payment.channel].label
  const { accountNumber, paymentCode, checkoutUrl, qrString, cardLast4 } = payment.instructions
  switch (payment.method) {
    case 'virtual_account':
      return {
        label: `${channel} virtual account`,
        value: accountNumber ?? payment.providerReference,
      }
    case 'retail':
      return { label: `${channel} payment code`, value: paymentCode ?? payment.providerReference }
    case 'ewallet':
      return { label: `${channel} link`, value: checkoutUrl ?? payment.providerReference }
    case 'qris':
      return { label: 'QRIS', value: qrString ?? payment.providerReference }
    case 'card':
      return { label: 'Card', value: `Card ending ${cardLast4 ?? '****'}` }
  }
}

function paymentRows(invoice: Invoice, payments: Payment[]): PaymentRow[] {
  if (invoice.status === 'paid') {
    const paid = payments.find((p) => p.status === 'success')
    return paid
      ? [
          { label: 'Xendit id', value: paid.providerReference },
          { label: 'Channel', value: PAYMENT_CHANNEL_BY_ID[paid.channel].label },
          { label: 'Paid at', value: fmtDateTime(paid.paidAt) },
        ]
      : [{ label: 'Paid at', value: fmtDateTime(invoice.paidAt) }]
  }
  if (invoice.status !== 'open' && invoice.status !== 'overdue') return []
  const pending = payments.find((p) => p.status === 'pending')
  if (!pending) {
    return [
      { label: 'How to pay', value: 'Open Billing in the portal and choose a payment method.' },
    ]
  }
  const rows = [instructionRow(pending)]
  if (pending.expiresAt) rows.push({ label: 'Expires', value: fmtDateTime(pending.expiresAt) })
  return rows
}

/** Printable invoice rendered without the portal shell so `window.print()` shows only the document. */
export function InvoiceDocumentPage() {
  const { id = '' } = useParams()
  const { invoicesById, payments, subscriptionsById, applicationsById, tenant } = useScoped()
  const invoice = invoicesById.get(id)

  if (!invoice) {
    return (
      <div className="bg-surface min-h-dvh p-4">
        <Card className="mx-auto max-w-[210mm]">
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
      </div>
    )
  }

  const sub = subscriptionsById.get(invoice.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const payable = invoice.status === 'open' || invoice.status === 'overdue'
  const period = `${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`
  const money = (amount: number) => fmtIdr(amount, invoice.currency)
  const notes = [
    sub && app
      ? `Subscription ${app.name} · ${BILLING_PERIOD_LABEL[invoice.billingPeriod ?? sub.billingPeriod]} billing.`
      : null,
    'Questions about this invoice: billing@saasgate.example.',
  ].filter((n): n is string => n !== null)

  return (
    <div className="bg-surface print-root min-h-dvh p-4">
      <div className="print-hidden mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card shadow-card rounded-full"
          aria-label="Back to invoice"
          asChild
        >
          <Link to={`/billing/${invoice.id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-[10rem] flex-1 truncate text-lg font-bold tracking-tight">
          Invoice {invoice.number}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Download PDF
          </Button>
          {payable ? (
            <Button asChild>
              <Link to={`/billing/${invoice.id}/pay`}>Pay invoice</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <InvoiceDocument
        number={invoice.number}
        {...STAMP[invoice.status]}
        issuedAt={fmtDate(invoice.issuedAt)}
        dueDate={fmtDate(invoice.dueDate)}
        paidAt={invoice.paidAt ? fmtDate(invoice.paidAt) : null}
        seller={SELLER}
        buyer={{
          name: tenant?.name ?? 'Your organization',
          lines: tenant ? [tenant.billingEmail, tenant.country] : [],
        }}
        lines={invoice.lines.map((l) => ({
          description: l.description,
          period,
          amount: money(l.amount),
        }))}
        subtotal={money(invoiceSubtotal(invoice))}
        taxLabel={`PPN ${Math.round(invoice.taxRate * 100)}%`}
        tax={money(invoiceTax(invoice))}
        total={money(invoice.total)}
        paymentRows={paymentRows(
          invoice,
          payments.filter((p) => p.invoiceId === invoice.id),
        )}
        notes={notes}
      />
    </div>
  )
}
