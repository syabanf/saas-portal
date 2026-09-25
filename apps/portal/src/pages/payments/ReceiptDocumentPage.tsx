import { fmtIdr, invoiceSubtotal, invoiceTax, platformOf, receiptNumber } from '@scp/fixtures'
import { useFormat, useT } from '@scp/i18n'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import { Button, Card, EmptyState, ReceiptDocument } from '@scp/ui'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/document-title'
import { useScoped } from '../../state/app-state'
import { issuerParty } from '../billing/InvoiceDocumentPage'

/** Printable receipt for a settled payment, rendered without the portal shell. */
export function ReceiptDocumentPage() {
  const t = useT()
  const { formatDate, formatDateTime } = useFormat()
  const { paymentId = '' } = useParams()
  const { state, payments, invoicesById, subscriptionsById, applicationsById, tenant } = useScoped()
  const payment = payments.find((p) => p.id === paymentId)
  const settled = payment?.status === 'success'
  useDocumentTitle(
    payment && settled
      ? t('document.receiptTitle', { number: receiptNumber(payment) })
      : t('common.paymentNotFound'),
  )

  if (!payment || !settled) {
    return (
      <div className="bg-surface min-h-dvh p-4">
        <Card className="mx-auto max-w-[210mm]">
          <EmptyState
            icon={<FileText />}
            title={payment ? t('document.noReceipt') : t('common.paymentNotFound')}
            description={
              payment ? t('document.noReceiptDescription') : t('common.notFoundDescription')
            }
            action={
              <Button variant="outline" asChild>
                <Link to={payment ? `/payments/${payment.id}` : '/billing'}>
                  {payment ? t('common.backToPayment') : t('common.backToBilling')}
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const platform = platformOf(state)
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
          aria-label={t('common.backToPayment')}
          asChild
        >
          <Link to={`/payments/${payment.id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-[10rem] flex-1 truncate text-lg font-bold tracking-tight">
          {t('document.receiptTitle', { number: receiptNumber(payment) })}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> {t('document.downloadPdf')}
          </Button>
          {invoice ? (
            <Button variant="outline" asChild>
              <Link to={`/billing/${invoice.id}/document`}>{t('common.viewInvoice')}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ReceiptDocument
        number={receiptNumber(payment)}
        paidAt={formatDateTime(payment.paidAt)}
        total={money(payment.amount)}
        payee={issuerParty(platform)}
        payer={{
          name: tenant?.name ?? t('common.yourOrganization'),
          lines: tenant ? [tenant.billingEmail, tenant.country] : [],
        }}
        items={[
          { label: t('common.invoice'), value: invoice?.number ?? payment.externalId },
          ...(app && sub
            ? [
                {
                  label: t('common.subscription'),
                  value: `${app.name} · ${t(`period.${sub.billingPeriod}`)}`,
                },
              ]
            : []),
          ...(invoice
            ? [
                {
                  label: t('common.period'),
                  value: t('common.dateRange', {
                    from: formatDate(invoice.periodStart),
                    to: formatDate(invoice.periodEnd),
                  }),
                },
              ]
            : []),
        ]}
        amounts={
          invoice
            ? [
                { label: t('common.subtotal'), value: money(invoiceSubtotal(invoice)) },
                {
                  label: t('common.ppn', { rate: Math.round(invoice.taxRate * 100) }),
                  value: money(invoiceTax(invoice)),
                },
                { label: t('document.amountPaid'), value: money(payment.amount) },
              ]
            : [{ label: t('document.amountPaid'), value: money(payment.amount) }]
        }
        paymentRows={[
          { label: t('common.xenditId'), value: payment.providerReference },
          { label: t('common.externalId'), value: payment.externalId },
          { label: t('common.method'), value: t(`method.${payment.method}`) },
          { label: t('common.channel'), value: channel.label },
        ]}
        notes={[
          t('document.receiptNote', { brand: platform.brandName }),
          t('document.paymentQuestions', { email: platform.billingEmail }),
        ]}
      />
    </div>
  )
}
