import { fmtIdr, invoiceSubtotal, invoiceTax, platformOf } from '@scp/fixtures'
import { useFormat, useT, type Formatters, type Translate } from '@scp/i18n'
import type { Invoice, InvoiceStatus, Payment, PlatformSettings } from '@scp/types'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import {
  Button,
  Card,
  EmptyState,
  InvoiceDocument,
  type InvoiceDocumentProps,
  type InvoiceParty,
} from '@scp/ui'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/document-title'
import { useScoped } from '../../state/app-state'

const STAMP_TONE: Record<InvoiceStatus, InvoiceDocumentProps['stampTone']> = {
  paid: 'success',
  open: 'warning',
  overdue: 'danger',
  draft: 'muted',
  void: 'muted',
}

/** The platform as it appears on invoices and receipts: brand on top, legal details below. */
export function issuerParty(platform: PlatformSettings): InvoiceParty {
  return {
    name: platform.brandName,
    lines: [
      platform.legalName,
      ...platform.addressLines,
      platform.billingEmail,
      `NPWP ${platform.taxId}`,
    ],
  }
}

type PaymentRow = { label: string; value: string }

function instructionRow(t: Translate, payment: Payment): PaymentRow {
  const channel = PAYMENT_CHANNEL_BY_ID[payment.channel].label
  const { accountNumber, paymentCode, checkoutUrl, qrString, cardLast4 } = payment.instructions
  switch (payment.method) {
    case 'virtual_account':
      return {
        label: t('document.virtualAccount', { channel }),
        value: accountNumber ?? payment.providerReference,
      }
    case 'retail':
      return {
        label: t('document.paymentCode', { channel }),
        value: paymentCode ?? payment.providerReference,
      }
    case 'ewallet':
      return {
        label: t('document.link', { channel }),
        value: checkoutUrl ?? payment.providerReference,
      }
    case 'qris':
      return { label: 'QRIS', value: qrString ?? payment.providerReference }
    case 'card':
      return {
        label: t('document.card'),
        value: t('document.cardEnding', { last4: cardLast4 ?? '****' }),
      }
  }
}

function paymentRows(
  t: Translate,
  { formatDateTime }: Formatters,
  invoice: Invoice,
  payments: Payment[],
): PaymentRow[] {
  if (invoice.status === 'paid') {
    const paid = payments.find((p) => p.status === 'success')
    return paid
      ? [
          { label: t('common.xenditId'), value: paid.providerReference },
          { label: t('common.channel'), value: PAYMENT_CHANNEL_BY_ID[paid.channel].label },
          { label: t('common.paidAt'), value: formatDateTime(paid.paidAt) },
        ]
      : [{ label: t('common.paidAt'), value: formatDateTime(invoice.paidAt) }]
  }
  if (invoice.status !== 'open' && invoice.status !== 'overdue') return []
  const pending = payments.find((p) => p.status === 'pending')
  if (!pending) {
    return [{ label: t('document.howToPay'), value: t('document.howToPayDescription') }]
  }
  const rows = [instructionRow(t, pending)]
  if (pending.expiresAt)
    rows.push({ label: t('common.expires'), value: formatDateTime(pending.expiresAt) })
  return rows
}

/** Printable invoice rendered without the portal shell so `window.print()` shows only the document. */
export function InvoiceDocumentPage() {
  const t = useT()
  const format = useFormat()
  const { formatDate } = format
  const { id = '' } = useParams()
  const { state, invoicesById, payments, subscriptionsById, applicationsById, tenant } = useScoped()
  const invoice = invoicesById.get(id)
  useDocumentTitle(
    invoice ? t('document.invoiceTitle', { number: invoice.number }) : t('common.invoiceNotFound'),
  )

  if (!invoice) {
    return (
      <div className="bg-surface min-h-dvh p-4">
        <Card className="mx-auto max-w-[210mm]">
          <EmptyState
            icon={<FileText />}
            title={t('common.invoiceNotFound')}
            description={t('common.notFoundDescription')}
            action={
              <Button variant="outline" asChild>
                <Link to="/billing">{t('common.backToBilling')}</Link>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const platform = platformOf(state)
  const sub = subscriptionsById.get(invoice.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const payable = invoice.status === 'open' || invoice.status === 'overdue'
  const period = t('common.dateRange', {
    from: formatDate(invoice.periodStart),
    to: formatDate(invoice.periodEnd),
  })
  const money = (amount: number) => fmtIdr(amount, invoice.currency)
  const notes = [
    sub && app
      ? t('document.subscriptionNote', {
          app: app.name,
          period: t(`period.${invoice.billingPeriod ?? sub.billingPeriod}`).toLowerCase(),
        })
      : null,
    t('document.invoiceQuestions', { email: platform.billingEmail }),
  ].filter((n): n is string => n !== null)

  return (
    <div className="bg-surface print-root min-h-dvh p-4">
      <div className="print-hidden mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card shadow-card rounded-full"
          aria-label={t('common.backToInvoice')}
          asChild
        >
          <Link to={`/billing/${invoice.id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-[10rem] flex-1 truncate text-lg font-bold tracking-tight">
          {t('document.invoiceTitle', { number: invoice.number })}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {t('document.downloadPdf')}
          </Button>
          {payable ? (
            <Button asChild>
              <Link to={`/billing/${invoice.id}/pay`}>{t('common.payInvoice')}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <InvoiceDocument
        number={invoice.number}
        stamp={t(`document.stamp.${invoice.status}`)}
        stampTone={STAMP_TONE[invoice.status]}
        issuedAt={formatDate(invoice.issuedAt)}
        dueDate={formatDate(invoice.dueDate)}
        paidAt={invoice.paidAt ? formatDate(invoice.paidAt) : null}
        seller={issuerParty(platform)}
        buyer={{
          name: tenant?.name ?? t('common.yourOrganization'),
          lines: tenant ? [tenant.billingEmail, tenant.country] : [],
        }}
        lines={invoice.lines.map((l) => ({
          description: l.description,
          period,
          amount: money(l.amount),
        }))}
        subtotal={money(invoiceSubtotal(invoice))}
        taxLabel={t('common.ppn', { rate: Math.round(invoice.taxRate * 100) })}
        tax={money(invoiceTax(invoice))}
        total={money(invoice.total)}
        paymentRows={paymentRows(
          t,
          format,
          invoice,
          payments.filter((p) => p.invoiceId === invoice.id),
        )}
        notes={notes}
      />
    </div>
  )
}
