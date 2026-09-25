import { fmtIdr, invoiceSubtotal, invoiceTax } from '@scp/fixtures'
import { useFormat, useT } from '@scp/i18n'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'
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
  const t = useT()
  const { formatDate, formatDateTime } = useFormat()
  const { id = '' } = useParams()
  const { invoicesById, payments, subscriptionsById, applicationsById } = useScoped()
  const invoice = invoicesById.get(id)

  if (!invoice) {
    return (
      <Card>
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
              <FileText /> {t('common.viewInvoice')}
            </Link>
          </Button>
          {payable ? (
            <Button asChild>
              <Link to={`/billing/${invoice.id}/pay`}>{t('common.payInvoice')}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {pendingPayment ? (
        <Banner
          tone="warning"
          icon={<Clock />}
          title={t('invoice.waitingFor', {
            channel: PAYMENT_CHANNEL_BY_ID[pendingPayment.channel].label,
          })}
          description={
            pendingPayment.expiresAt
              ? t('invoice.expiresAt', { date: formatDateTime(pendingPayment.expiresAt) })
              : undefined
          }
          action={
            <Button size="sm" asChild>
              <Link to={`/payments/${pendingPayment.id}`}>{t('invoice.viewInstructions')}</Link>
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
                {app
                  ? t('invoice.paidSummary', {
                      date: formatDateTime(invoice.paidAt),
                      app: app.name,
                    })
                  : t('invoice.paidSummaryNoApp', { date: formatDateTime(invoice.paidAt) })}
              </p>
              <p className="text-muted text-xs">{t('invoice.usersCanOpen')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {app ? (
                <Button size="sm" asChild>
                  <a href={app.baseUrl} target="_blank" rel="noreferrer">
                    {t('common.openApp', { name: app.name })}
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <Link to="/billing">{t('common.backToBilling')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('invoice.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={[
                { label: t('common.issued'), value: formatDate(invoice.issuedAt) },
                { label: t('common.due'), value: formatDate(invoice.dueDate) },
                {
                  label: t('common.period'),
                  value: t('common.dateRange', {
                    from: formatDate(invoice.periodStart),
                    to: formatDate(invoice.periodEnd),
                  }),
                },
                {
                  label: t('common.paidAt'),
                  value: invoice.paidAt ? formatDateTime(invoice.paidAt) : t('common.notYet'),
                },
                {
                  label: t('common.subscription'),
                  value: sub ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {app?.name ?? sub.applicationId} ·{' '}
                      {t(`period.${invoice.billingPeriod ?? sub.billingPeriod}`)}{' '}
                      <SubscriptionBadge status={sub.status} />
                    </span>
                  ) : (
                    '—'
                  ),
                },
                {
                  label: t('invoice.accessUntil'),
                  value: formatDate(sub?.gracePeriodEnd ?? sub?.currentPeriodEnd),
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('invoice.lineItems')}</CardTitle>
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
                <span className="text-muted">{t('common.subtotal')}</span>
                <span className="tabular-nums">
                  {fmtIdr(invoiceSubtotal(invoice), invoice.currency)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-muted">
                  {t('common.ppn', { rate: Math.round(invoice.taxRate * 100) })}
                </span>
                <span className="tabular-nums">
                  {fmtIdr(invoiceTax(invoice), invoice.currency)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-3 font-semibold">
                <span>{t('common.total')}</span>
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
          <CardTitle>{t('invoice.paymentsFor')}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicePayments.length === 0 ? (
            <p className="text-muted text-sm">{t('invoice.noPaymentRecorded')}</p>
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
                    <span className="tabular-nums">{fmtIdr(p.amount, p.currency)}</span>
                    <PaymentBadge status={p.status} />
                    <span className="text-muted ml-auto text-xs">
                      {formatDateTime(p.paidAt ?? p.createdAt)}
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
