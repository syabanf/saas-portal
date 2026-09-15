import { fmtAgo, fmtDate, fmtIdr, fmtNumber } from '@scp/fixtures'
import type { Invoice, Payment } from '@scp/types'
import {
  BILLING_PERIOD_LABEL,
  INVOICE_STATUS_LABEL,
  PAYMENT_CHANNELS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@scp/types'
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
  type ComboboxOption,
} from '@scp/ui'
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Search, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, PaymentChannelLabel } from '../../components/badges'
import {
  ClearFiltersButton,
  FilterCombobox,
  applicationOptions,
  labelOptions,
  noMatches,
  useFilterParams,
} from '../../components/filters'
import { OutstandingBanner } from '../../components/OutstandingBanner'
import { useScoped } from '../../state/app-state'

const DAY = 86_400_000
type IssuedWindow = 'month' | '30d' | '90d'
const ISSUED_LABEL: Record<IssuedWindow, string> = {
  month: 'This month',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

function issuedSince(window: string, now: number): number {
  if (window === 'month')
    return new Date(new Date(now).getFullYear(), new Date(now).getMonth()).getTime()
  if (window === '30d') return now - 30 * DAY
  if (window === '90d') return now - 90 * DAY
  return 0
}

const CHANNEL_OPTIONS: ComboboxOption[] = PAYMENT_CHANNELS.map((c) => ({
  value: c.channel,
  label: c.label,
  group: PAYMENT_METHOD_LABEL[c.method],
}))

/** Blueprint §42, §44, §74: billing stays reachable whatever the subscription state. */
export function BillingPage() {
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
      ? `${applicationsById.get(sub.applicationId)?.name ?? sub.applicationId} · ${BILLING_PERIOD_LABEL[sub.billingPeriod]}`
      : '—'
  }

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice',
      sortValue: (i) => i.number,
      cell: (i) => <Mono className="font-semibold">{i.number}</Mono>,
    },
    { key: 'sub', header: 'Application · period', cell: label },
    {
      key: 'issued',
      header: 'Issued',
      sortValue: (i) => i.issuedAt,
      cell: (i) => fmtDate(i.issuedAt),
    },
    { key: 'due', header: 'Due', sortValue: (i) => i.dueDate, cell: (i) => fmtDate(i.dueDate) },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (i) => i.total,
      cell: (i) => (
        <span className="font-semibold tabular-nums">{fmtIdr(i.total, i.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
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
              Pay invoice
            </Link>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label="Document" asChild>
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
      header: 'Channel',
      sortValue: (p) => p.channel,
      cell: (p) => <PaymentChannelLabel payment={p} />,
    },
    { key: 'ref', header: 'Reference', cell: (p) => <Mono>{p.providerReference}</Mono> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (p) => p.amount,
      cell: (p) => <span className="tabular-nums">{fmtIdr(p.amount, p.currency)}</span>,
    },
    { key: 'status', header: 'Status', cell: (p) => <PaymentBadge status={p.status} /> },
    {
      key: 'created',
      header: 'Created',
      sortValue: (p) => p.createdAt,
      cell: (p) => fmtAgo(p.createdAt),
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
            Continue
          </Link>
        ) : p.status === 'success' ? (
          <Link
            to={`/payments/${p.id}/receipt`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted hover:text-foreground text-xs font-semibold"
          >
            Receipt
          </Link>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" description="Invoices and payments for your organization." />
      <OutstandingBanner />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={fmtIdr(outstanding)}
          hint={`${fmtNumber(open.length)} open ${open.length === 1 ? 'invoice' : 'invoices'}`}
          icon={<Wallet />}
          tone={outstanding > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Overdue"
          value={fmtNumber(overdue)}
          hint="Invoices past due date"
          icon={<AlertTriangle />}
          tone={overdue > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Paid this year"
          value={fmtIdr(paidThisYear)}
          hint={String(year)}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="Next due date"
          value={nextDue ? fmtDate(nextDue) : '—'}
          hint={nextDue ? 'Earliest open invoice' : 'Nothing due'}
          icon={<CalendarClock />}
          tone="info"
        />
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Invoices</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              tone="nested"
              leftIcon={<Search />}
              value={invoiceFilters.values.q}
              onChange={(e) => invoiceFilters.set('q', e.target.value)}
              placeholder="Search invoice number"
              aria-label="Search invoices"
              className="w-full sm:w-60 [&_input]:rounded-full"
            />
            <FilterCombobox
              value={invoiceFilters.values.status}
              onChange={(v) => invoiceFilters.set('status', v)}
              options={labelOptions(INVOICE_STATUS_LABEL, [
                'open',
                'overdue',
                'paid',
                'draft',
                'void',
              ])}
              allLabel="All statuses"
              searchPlaceholder="Search statuses"
            />
            <FilterCombobox
              value={invoiceFilters.values.app}
              onChange={(v) => invoiceFilters.set('app', v)}
              options={applicationOptions(applications.filter((item) => item.subscription))}
              allLabel="All applications"
              searchPlaceholder="Search applications"
            />
            <FilterCombobox
              value={invoiceFilters.values.issued}
              onChange={(v) => invoiceFilters.set('issued', v)}
              options={labelOptions(ISSUED_LABEL)}
              allLabel="All time"
              searchPlaceholder="Search periods"
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
                  title: 'No invoices yet',
                  description: 'Invoices appear here once a subscription starts.',
                }
          }
        />
      </Card>
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Payments</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <FilterCombobox
              value={paymentFilters.values.pstatus}
              onChange={(v) => paymentFilters.set('pstatus', v)}
              options={labelOptions(PAYMENT_STATUS_LABEL)}
              allLabel="All statuses"
              searchPlaceholder="Search statuses"
            />
            <FilterCombobox
              value={paymentFilters.values.channel}
              onChange={(v) => paymentFilters.set('channel', v)}
              options={CHANNEL_OPTIONS}
              allLabel="All channels"
              searchPlaceholder="Search channels"
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
                  title: 'No payments yet',
                  description: 'Payments show up here after an invoice is settled.',
                }
          }
        />
      </Card>
    </div>
  )
}
