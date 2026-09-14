import { fmtDate, fmtDateTime, fmtIdr, invoiceSubtotal, invoiceTax } from '@scp/fixtures'
import type { Invoice, InvoiceStatus, Payment } from '@scp/types'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  InvoiceDocument,
  type InvoiceDocumentProps,
} from '@scp/ui'
import { ArrowLeft, CheckCircle2, Printer, Send } from 'lucide-react'
import * as React from 'react'
import { Link, useParams } from 'react-router'
import { countryLabel } from '../../components/master/TenantDialog'
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

type PaymentRows = NonNullable<InvoiceDocumentProps['paymentRows']>

function instructionRow(p: Payment): PaymentRows[number] | null {
  const { accountNumber, paymentCode, checkoutUrl } = p.instructions
  if (accountNumber) return { label: 'Virtual account', value: accountNumber }
  if (paymentCode) return { label: 'Payment code', value: paymentCode }
  if (checkoutUrl) return { label: 'Pay online', value: checkoutUrl }
  return null
}

function paymentRows(invoice: Invoice, payments: Payment[]): PaymentRows {
  if (invoice.status === 'paid') {
    const paid = payments.find((p) => p.status === 'success')
    if (!paid) return []
    return [
      { label: 'Xendit ID', value: paid.providerReference },
      { label: 'Channel', value: PAYMENT_CHANNEL_BY_ID[paid.channel].label },
      { label: 'Paid at', value: fmtDateTime(paid.paidAt) },
    ]
  }
  if (invoice.status !== 'open' && invoice.status !== 'overdue') return []
  const pending = payments.find((p) => p.status === 'pending')
  const instruction = pending ? instructionRow(pending) : null
  if (!pending || !instruction) {
    return [
      {
        label: 'How to pay',
        value: `Pay through the SaaS Portal at http://localhost:5174/billing/${invoice.id}/pay`,
      },
    ]
  }
  return [
    { label: 'Channel', value: PAYMENT_CHANNEL_BY_ID[pending.channel].label },
    instruction,
    ...(pending.expiresAt ? [{ label: 'Expires', value: fmtDateTime(pending.expiresAt) }] : []),
  ]
}

/** The printable invoice, rendered outside the admin shell so printing shows only the document. */
export function InvoiceDocumentPage() {
  const { id = '' } = useParams()
  const { invoicesById, tenantsById, subscriptionsById, applicationsById, payments } = useScoped()
  const invoice = invoicesById.get(id)
  const [sending, setSending] = React.useState(false)

  if (!invoice) {
    return (
      <div className="bg-surface min-h-dvh p-4">
        <Card className="mx-auto max-w-[210mm]">
          <EmptyState
            title="Invoice not found"
            description="It may have been deleted."
            action={
              <Button variant="outline" asChild>
                <Link to="/billing">
                  <ArrowLeft /> Back to billing
                </Link>
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
  const invoicePayments = payments
    .filter((p) => p.invoiceId === invoice.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const period = `${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`

  return (
    <div className="bg-surface print-root min-h-dvh p-4">
      <div className="print-hidden mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/billing/${invoice.id}`}>
            <ArrowLeft /> Back to invoice
          </Link>
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Download PDF
          </Button>
          <Button onClick={() => setSending(true)}>
            <Send /> Send to customer
          </Button>
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
          name: tenant?.name ?? invoice.tenantId,
          lines: tenant ? [tenant.billingEmail, countryLabel(tenant.country)] : [],
        }}
        lines={invoice.lines.map((l) => ({
          description: l.description,
          period,
          amount: fmtIdr(l.amount, invoice.currency),
        }))}
        subtotal={fmtIdr(invoiceSubtotal(invoice), invoice.currency)}
        taxLabel={`PPN ${Math.round(invoice.taxRate * 100)}%`}
        tax={fmtIdr(invoiceTax(invoice), invoice.currency)}
        total={fmtIdr(invoice.total, invoice.currency)}
        paymentRows={paymentRows(invoice, invoicePayments)}
        notes={[
          ...(subscription
            ? [
                `Subscription ${application?.name ?? subscription.applicationId} · ${BILLING_PERIOD_LABEL[invoice.billingPeriod ?? subscription.billingPeriod]} billing.`,
              ]
            : []),
          'This invoice was generated by SaaS Gate. Reply to billing@saasgate.example for questions.',
        ]}
      />

      <SendInvoiceDialog
        open={sending}
        onOpenChange={setSending}
        number={invoice.number}
        email={tenant?.billingEmail ?? ''}
      />
    </div>
  )
}

interface SendInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  number: string
  email: string
}

/** Demo only: confirms the send without dispatching anything. */
function SendInvoiceDialog({ open, onOpenChange, number, email }: SendInvoiceDialogProps) {
  const [to, setTo] = React.useState(email)
  const [sent, setSent] = React.useState(false)
  React.useEffect(() => {
    if (open) {
      setTo(email)
      setSent(false)
    }
  }, [open, email])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Send {number}</DialogTitle>
          <DialogDescription>
            The PDF goes to the billing contact of the organization.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="bg-success-soft text-success flex items-center gap-3 rounded-2xl px-4 py-3 text-sm">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>
              {number} was sent to <span className="font-semibold">{to}</span>.
            </span>
          </div>
        ) : (
          <FormField label="Send to" htmlFor="send-invoice-email">
            <Input
              id="send-invoice-email"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </FormField>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {sent ? 'Close' : 'Cancel'}
          </Button>
          {sent ? null : (
            <Button type="button" disabled={!to.trim()} onClick={() => setSent(true)}>
              <Send /> Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
