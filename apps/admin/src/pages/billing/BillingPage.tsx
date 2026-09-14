import { fmtDate, fmtIdr, fmtNumber } from '@scp/fixtures'
import type { Invoice, InvoiceStatus } from '@scp/types'
import { BILLING_PERIOD_LABEL, INVOICE_STATUS_LABEL } from '@scp/types'
import {
  Banner,
  Button,
  Card,
  CountBadge,
  DataTable,
  Input,
  PageHeader,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  type Column,
} from '@scp/ui'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FilePlus2,
  FileText,
  Plus,
  Search,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { InvoiceBadge, Mono } from '../../components/badges'
import { InvoiceDialog } from '../../components/master/InvoiceDialog'
import { useScoped } from '../../state/app-state'
import { isThisMonth } from './dates'
import { GenerateInvoicesDialog } from './GenerateInvoicesDialog'
import { SimulatePaymentConfirm } from './SimulatePaymentConfirm'

const TAB_ORDER: InvoiceStatus[] = ['open', 'overdue', 'paid', 'draft', 'void']

function isStatus(value: string | null): value is InvoiceStatus {
  return TAB_ORDER.includes(value as InvoiceStatus)
}

export function BillingPage() {
  const navigate = useNavigate()
  const {
    invoices: allInvoices,
    tenantsById,
    subscriptionsById,
    applicationsById,
    dispatch,
  } = useScoped()
  const [params, setParams] = useSearchParams()
  const tenantId = params.get('tenant')
  const tenant = tenantId ? tenantsById.get(tenantId) : undefined
  const invoices = React.useMemo(
    () => (tenantId ? allInvoices.filter((i) => i.tenantId === tenantId) : allInvoices),
    [allInvoices, tenantId],
  )
  const statusParam = params.get('status')
  const tab: 'all' | InvoiceStatus = isStatus(statusParam) ? statusParam : 'all'
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [generated, setGenerated] = React.useState(0)
  const [paying, setPaying] = React.useState<Invoice | null>(null)
  const now = Date.now()

  const subscriptionLabel = React.useCallback(
    (inv: Invoice) => {
      const sub = subscriptionsById.get(inv.subscriptionId)
      if (!sub) return '—'
      return `${applicationsById.get(sub.applicationId)?.name ?? sub.applicationId} · ${BILLING_PERIOD_LABEL[inv.billingPeriod ?? sub.billingPeriod]}`
    },
    [subscriptionsById, applicationsById],
  )

  const stats = React.useMemo(() => {
    let outstanding = 0
    let paidThisMonth = 0
    const counts = new Map<InvoiceStatus, number>()
    for (const i of invoices) {
      counts.set(i.status, (counts.get(i.status) ?? 0) + 1)
      if (i.status === 'open' || i.status === 'overdue') outstanding += i.total
      if (i.status === 'paid' && isThisMonth(i.paidAt, now)) paidThisMonth += i.total
    }
    return { outstanding, paidThisMonth, counts }
  }, [invoices, now])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((i) => {
      if (tab !== 'all' && i.status !== tab) return false
      if (!q) return true
      return (
        i.number.toLowerCase().includes(q) ||
        (tenantsById.get(i.tenantId)?.name.toLowerCase().includes(q) ?? false) ||
        subscriptionLabel(i).toLowerCase().includes(q)
      )
    })
  }, [invoices, tab, query, tenantsById, subscriptionLabel])

  function selectTab(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('status')
    else next.set('status', value)
    setParams(next, { replace: true })
  }

  function voidInvoice(inv: Invoice) {
    dispatch({ type: 'invoices/upsert', invoice: { ...inv, status: 'void' } })
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice',
      cell: (i) => <Mono className="font-semibold">{i.number}</Mono>,
      sortValue: (i) => i.number,
    },
    {
      key: 'tenant',
      header: 'Organization',
      cell: (i) => tenantsById.get(i.tenantId)?.name ?? i.tenantId,
      sortValue: (i) => tenantsById.get(i.tenantId)?.name ?? '',
    },
    {
      key: 'subscription',
      header: 'Application',
      cell: subscriptionLabel,
      sortValue: subscriptionLabel,
    },
    {
      key: 'issued',
      header: 'Issued',
      cell: (i) => fmtDate(i.issuedAt),
      sortValue: (i) => i.issuedAt,
    },
    {
      key: 'due',
      header: 'Due',
      cell: (i) => (
        <span
          className={cn(
            i.status === 'overdue' || (i.status === 'open' && new Date(i.dueDate).getTime() < now)
              ? 'text-danger font-semibold'
              : undefined,
          )}
        >
          {fmtDate(i.dueDate)}
        </span>
      ),
      sortValue: (i) => i.dueDate,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (i) => (
        <span className="font-semibold tabular-nums">{fmtIdr(i.total, i.currency)}</span>
      ),
      sortValue: (i) => i.total,
    },
    { key: 'status', header: 'Status', cell: (i) => <InvoiceBadge status={i.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Invoices per subscription. A paid invoice reactivates its subscription; nothing else does."
        actions={
          <>
            <Input
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, organization or application"
              className="[&_input]:shadow-card w-full sm:w-72 [&_input]:rounded-full [&_input]:border-0"
            />
            <Button variant="secondary" onClick={() => setGenerating(true)}>
              <FilePlus2 /> Generate invoices
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus /> Create invoice
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {tenantId && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link to={`/organizations/${tenantId}`}>
                Back to {tenant?.name ?? 'organization'}
              </Link>
            </Button>
            <span>Billing for {tenant?.name ?? tenantId}</span>
            <Button
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('tenant')
                setParams(next)
              }}
            >
              Show all organizations
            </Button>
          </div>
        )}
        {generated > 0 ? (
          <Banner
            tone="success"
            icon={<CheckCircle2 />}
            title={`${generated} renewal ${generated === 1 ? 'invoice' : 'invoices'} generated.`}
            description="Each subscription got its next-period invoice, due in 14 days."
            onDismiss={() => setGenerated(0)}
          />
        ) : null}
        <Banner
          icon={<Workflow />}
          title="Payment is event-driven."
          description="Provider → webhook → billing → subscription → applications. Simulating a payment runs that whole chain."
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={fmtIdr(stats.outstanding)}
            hint="Open and overdue"
            icon={<Wallet />}
            tone="ink"
          />
          <StatCard
            label="Overdue"
            value={fmtNumber(stats.counts.get('overdue') ?? 0)}
            hint="Invoices past due date"
            icon={<AlertTriangle />}
            tone="danger"
          />
          <StatCard
            label="Paid this month"
            value={fmtIdr(stats.paidThisMonth)}
            hint="Current calendar month"
            icon={<CheckCircle2 />}
            tone="success"
          />
          <StatCard
            label="Open"
            value={fmtNumber(stats.counts.get('open') ?? 0)}
            hint="Awaiting payment"
            icon={<FileText />}
            tone="info"
          />
        </div>

        <Tabs value={tab} onValueChange={selectTab}>
          <TabsList>
            <TabsTrigger value="all">
              All <CountBadge count={invoices.length} className="bg-surface text-body ring-0" />
            </TabsTrigger>
            {TAB_ORDER.map((st) => (
              <TabsTrigger key={st} value={st}>
                {INVOICE_STATUS_LABEL[st]}{' '}
                <CountBadge
                  count={stats.counts.get(st) ?? 0}
                  className="bg-surface text-body ring-0"
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <DataTable
            rows={visible}
            columns={columns}
            rowKey={(i) => i.id}
            onRowClick={(i) => navigate(`/billing/${i.id}`)}
            rowActions={(i) => (
              <>
                {i.status === 'open' || i.status === 'overdue' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Settle with Xendit (demo)"
                    title="Settle with Xendit (demo)"
                    onClick={() => setPaying(i)}
                  >
                    <Zap />
                  </Button>
                ) : null}
                {i.status === 'open' || i.status === 'draft' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-accent"
                    aria-label="Void invoice"
                    title="Void invoice"
                    onClick={() => voidInvoice(i)}
                  >
                    <Ban />
                  </Button>
                ) : null}
              </>
            )}
            empty={{
              icon: <FileText />,
              title: invoices.length === 0 ? 'No invoices yet' : 'No invoices match',
              description:
                invoices.length === 0
                  ? 'Create an invoice for a subscription to start billing.'
                  : 'Try another status tab or clear the search.',
              action:
                invoices.length === 0 ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    Create invoice
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      selectTab('all')
                    }}
                  >
                    Clear filters
                  </Button>
                ),
            }}
          />
        </Card>
      </div>

      <InvoiceDialog open={creating} onOpenChange={setCreating} />
      <GenerateInvoicesDialog
        open={generating}
        onOpenChange={setGenerating}
        onGenerated={setGenerated}
      />
      <SimulatePaymentConfirm
        invoice={paying}
        onOpenChange={(open) => (open ? undefined : setPaying(null))}
      />
    </div>
  )
}
