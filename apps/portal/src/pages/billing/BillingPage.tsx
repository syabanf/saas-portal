import { fmtIdr, fmtNumber } from '@scp/fixtures'
import { useFormat, useT } from '@scp/i18n'
import type { Invoice, InvoiceStatus, Payment } from '@scp/types'
import { PAYMENT_CHANNELS, PAYMENT_STATUSES } from '@scp/types'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  PageHeader,
  StatCard,
  type Column,
} from '@scp/ui'
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Search, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, PaymentChannelLabel } from '../../components/badges'
import {
  ClearFiltersButton,
  FilterCombobox,
  enumOptions,
  useApplicationOptions,
  useFilterParams,
  useNoMatches,
} from '../../components/filters'
import { OutstandingBanner } from '../../components/OutstandingBanner'
import { useScoped } from '../../state/app-state'

const DAY = 86_400_000
type IssuedWindow = 'month' | '30d' | '90d'
const ISSUED_WINDOWS: IssuedWindow[] = ['month', '30d', '90d']
const INVOICE_STATUSES: InvoiceStatus[] = ['open', 'overdue', 'paid', 'draft', 'void']

function issuedSince(window: string, now: number): number {
  if (window === 'month')
    return new Date(new Date(now).getFullYear(), new Date(now).getMonth()).getTime()
  if (window === '30d') return now - 30 * DAY
  if (window === '90d') return now - 90 * DAY
  return 0
}

/** Blueprint §42, §44, §74: billing stays reachable whatever the subscription state. */
export function BillingPage() {
  const t = useT()
  const { formatDate, formatAgo } = useFormat()
  const noMatches = useNoMatches()
  const applicationOptions = useApplicationOptions()
  const navigate = useNavigate()
  const { invoices, payments, applications, subscriptionsById, applicationsById } = useScoped()
  const invoiceFilters = useFilterParams(['q', 'status', 'app', 'issued'])
  const paymentFilters = useFilterParams(['pstatus', 'channel'])
  const now = Date.now()
  const year = new Date(now).getFullYear()
  const open = invoices.filter((i) => i.status === 'open' || i.status === 'overdue')
  const outstanding = open.reduce((sum, i) => sum + i.total, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').length
  const paidThisYear = invoices
    .filter((i) => i.status === 'paid' && i.paidAt && new Date(i.paidAt).getFullYear() === year)
    .reduce((sum, i) => sum + i.total, 0)
  const nextDue = open.map((i) => i.dueDate).sort()[0] ?? null

  const q = invoiceFilters.values.q.trim().toLowerCase()
  const since = issuedSince(invoiceFilters.values.issued, now)
  const visibleInvoices = invoices
    .filter(
      (i) =>
        (!q || i.number.toLowerCase().includes(q)) &&
        (!invoiceFilters.values.status || i.status === invoiceFilters.values.status) &&
        (!invoiceFilters.values.app ||
          subscriptionsById.get(i.subscriptionId)?.applicationId === invoiceFilters.values.app) &&
        Date.parse(i.issuedAt) >= since,
    )
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const visiblePayments = payments
    .filter(
      (p) =>
        (!paymentFilters.values.pstatus || p.status === paymentFilters.values.pstatus) &&
        (!paymentFilters.values.channel || p.channel === paymentFilters.values.channel),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const label = (inv: Invoice) => {
    const sub = subscriptionsById.get(inv.subscriptionId)
    return sub
      ? `${applicationsById.get(sub.applicationId)?.name ?? sub.applicationId} · ${t(`period.${sub.billingPeriod}`)}`
      : '—'
  }

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'number',
      header: t('common.invoice'),
      sortValue: (i) => i.number,
      cell: (i) => <Mono className="font-semibold">{i.number}</Mono>,
    },
    { key: 'sub', header: t('billing.column.applicationPeriod'), cell: label },
    {
      key: 'issued',
      header: t('common.issued'),
      sortValue: (i) => i.issuedAt,
      cell: (i) => formatDate(i.issuedAt),
    },
    {
      key: 'due',
      header: t('common.due'),
      sortValue: (i) => i.dueDate,
      cell: (i) => formatDate(i.dueDate),
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      sortValue: (i) => i.total,
      cell: (i) => (
        <span className="font-semibold tabular-nums">{fmtIdr(i.total, i.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortValue: (i) => i.status,
      cell: (i) => <InvoiceBadge status={i.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (i) => (
        <span className="inline-flex items-center justify-end gap-2">
          {i.status === 'open' || i.status === 'overdue' ? (
            <Link
              to={`/billing/${i.id}/pay`}
              onClick={(e) => e.stopPropagation()}
              className="text-accent text-xs font-semibold"
            >
              {t('common.payInvoice')}
            </Link>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label={t('billing.document')} asChild>
            <Link to={`/billing/${i.id}/document`} onClick={(e) => e.stopPropagation()}>
              <FileText />
            </Link>
          </Button>
        </span>
      ),
    },
  ]

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'channel',
      header: t('common.channel'),
      sortValue: (p) => p.channel,
      cell: (p) => <PaymentChannelLabel payment={p} />,
    },
    {
      key: 'ref',
      header: t('billing.column.reference'),
      cell: (p) => <Mono>{p.providerReference}</Mono>,
    },
    {
      key: 'amount',
      header: t('common.amount'),
      align: 'right',
      sortValue: (p) => p.amount,
      cell: (p) => <span className="tabular-nums">{fmtIdr(p.amount, p.currency)}</span>,
    },
    { key: 'status', header: t('common.status'), cell: (p) => <PaymentBadge status={p.status} /> },
    {
      key: 'created',
      header: t('common.created'),
      sortValue: (p) => p.createdAt,
      cell: (p) => formatAgo(p.createdAt),
    },
    {
      key: 'continue',
      header: '',
      align: 'right',
      cell: (p) =>
        p.status === 'pending' ? (
          <Link
            to={`/payments/${p.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-accent text-xs font-semibold"
          >
            {t('common.continue')}
          </Link>
        ) : p.status === 'success' ? (
          <Link
            to={`/payments/${p.id}/receipt`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted hover:text-foreground text-xs font-semibold"
          >
            {t('common.receipt')}
          </Link>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.billing')} description={t('billing.description')} />
      <OutstandingBanner />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('billing.outstanding')}
          value={fmtIdr(outstanding)}
          hint={
            open.length === 1
              ? t('billing.openInvoiceOne')
              : t('billing.openInvoiceMany', { count: fmtNumber(open.length) })
          }
          icon={<Wallet />}
          tone={outstanding > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t('billing.overdue')}
          value={fmtNumber(overdue)}
          hint={t('billing.overdueHint')}
          icon={<AlertTriangle />}
          tone={overdue > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label={t('billing.paidThisYear')}
          value={fmtIdr(paidThisYear)}
          hint={String(year)}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label={t('billing.nextDue')}
          value={nextDue ? formatDate(nextDue) : '—'}
          hint={nextDue ? t('billing.nextDueHint') : t('billing.nothingDue')}
          icon={<CalendarClock />}
          tone="info"
        />
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{t('billing.invoices')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              tone="nested"
              leftIcon={<Search />}
              value={invoiceFilters.values.q}
              onChange={(e) => invoiceFilters.set('q', e.target.value)}
              placeholder={t('billing.searchInvoiceNumber')}
              aria-label={t('billing.searchInvoices')}
              className="w-full sm:w-60 [&_input]:rounded-full"
            />
            <FilterCombobox
              value={invoiceFilters.values.status}
              onChange={(v) => invoiceFilters.set('status', v)}
              options={enumOptions(INVOICE_STATUSES, (s) => t(`status.invoice.${s}`))}
              allLabel={t('common.allStatuses')}
              searchPlaceholder={t('common.searchStatuses')}
            />
            <FilterCombobox
              value={invoiceFilters.values.app}
              onChange={(v) => invoiceFilters.set('app', v)}
              options={applicationOptions(applications.filter((item) => item.subscription))}
              allLabel={t('common.allApplications')}
              searchPlaceholder={t('common.searchApplications')}
            />
            <FilterCombobox
              value={invoiceFilters.values.issued}
              onChange={(v) => invoiceFilters.set('issued', v)}
              options={enumOptions(ISSUED_WINDOWS, (w) => t(`billing.issued.${w}`))}
              allLabel={t('billing.allTime')}
              searchPlaceholder={t('billing.searchPeriods')}
            />
            {invoiceFilters.active ? <ClearFiltersButton onClick={invoiceFilters.clear} /> : null}
          </div>
        </CardHeader>
        <DataTable
          rows={visibleInvoices}
          columns={invoiceColumns}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate(`/billing/${i.id}`)}
          empty={
            invoiceFilters.active
              ? noMatches(invoiceFilters.clear)
              : {
                  title: t('billing.noInvoices'),
                  description: t('billing.noInvoicesDescription'),
                }
          }
        />
      </Card>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{t('billing.payments')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <FilterCombobox
              value={paymentFilters.values.pstatus}
              onChange={(v) => paymentFilters.set('pstatus', v)}
              options={enumOptions(PAYMENT_STATUSES, (s) => t(`status.payment.${s}`))}
              allLabel={t('common.allStatuses')}
              searchPlaceholder={t('common.searchStatuses')}
            />
            <FilterCombobox
              value={paymentFilters.values.channel}
              onChange={(v) => paymentFilters.set('channel', v)}
              options={PAYMENT_CHANNELS.map((c) => ({
                value: c.channel,
                label: c.label,
                group: t(`method.${c.method}`),
              }))}
              allLabel={t('billing.allChannels')}
              searchPlaceholder={t('billing.searchChannels')}
            />
            {paymentFilters.active ? <ClearFiltersButton onClick={paymentFilters.clear} /> : null}
          </div>
        </CardHeader>
        <DataTable
          rows={visiblePayments}
          columns={paymentColumns}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/payments/${p.id}`)}
          empty={
            paymentFilters.active
              ? noMatches(paymentFilters.clear)
              : {
                  title: t('billing.noPayments'),
                  description: t('billing.noPaymentsDescription'),
                }
          }
        />
      </Card>
    </div>
  )
}
