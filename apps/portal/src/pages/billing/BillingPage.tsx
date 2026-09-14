import { fmtAgo, fmtDate, fmtIdr, fmtNumber } from '@scp/fixtures'
import type { Invoice, Payment } from '@scp/types'
import { BILLING_PERIOD_LABEL } from '@scp/types'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  StatCard,
  type Column,
} from '@scp/ui'
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, PaymentChannelLabel } from '../../components/badges'
import { OutstandingBanner } from '../../components/OutstandingBanner'
import { useScoped } from '../../state/app-state'

/** Blueprint §42, §44, §74: billing stays reachable whatever the subscription state. */
export function BillingPage() {
  const navigate = useNavigate()
  const { invoices, payments, subscriptionsById, applicationsById } = useScoped()
  const year = new Date().getFullYear()
  const open = invoices.filter((i) => i.status === 'open' || i.status === 'overdue')
  const outstanding = open.reduce((sum, i) => sum + i.total, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').length
  const paidThisYear = invoices
    .filter((i) => i.status === 'paid' && i.paidAt && new Date(i.paidAt).getFullYear() === year)
    .reduce((sum, i) => sum + i.total, 0)
  const nextDue = open.map((i) => i.dueDate).sort()[0] ?? null

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
      sortValue: (p) => p.amount + p.fee,
      cell: (p) => <span className="tabular-nums">{fmtIdr(p.amount + p.fee, p.currency)}</span>,
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
          hint={`${fmtNumber(open.length)} open invoices`}
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
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <DataTable
          rows={invoices.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))}
          columns={invoiceColumns}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate(`/billing/${i.id}`)}
          empty={{
            title: 'No invoices yet',
            description: 'Invoices appear here once a subscription starts.',
          }}
        />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <DataTable
          rows={payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
          columns={paymentColumns}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/payments/${p.id}`)}
          empty={{
            title: 'No payments yet',
            description: 'Payments show up here after an invoice is settled.',
          }}
        />
      </Card>
    </div>
  )
}
