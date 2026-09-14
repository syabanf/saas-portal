import { fmtDateTime, fmtIdr, fmtNumber } from '@scp/fixtures'
import type { Payment, PaymentMethod, PaymentStatus } from '@scp/types'
import {
  PAYMENT_CHANNEL_BY_ID,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
} from '@scp/types'
import {
  Banner,
  Button,
  Card,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  PageHeader,
  Select,
  StatCard,
  type Column,
} from '@scp/ui'
import {
  CheckCircle2,
  Clock,
  CreditCard,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Webhook,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono, PaymentBadge } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { isThisMonth } from '../billing/dates'
import { PENDING_TRANSITIONS, RefundPaymentDialog } from './PaymentActions'
import { SimulatePaymentDialog } from './SimulatePaymentDialog'

const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

/** Blueprint §26: Xendit payment records. Status here never grants access by itself. */
export function PaymentsPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { payments, tenantsById, dispatch } = useScoped()
  const [status, setStatus] = React.useState<'' | PaymentStatus>('')
  const [method, setMethod] = React.useState<'' | PaymentMethod>('')
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [refunding, setRefunding] = React.useState<Payment | null>(null)
  const now = Date.now()

  const stats = React.useMemo(() => {
    const counts: Record<PaymentStatus, number> = {
      pending: 0,
      success: 0,
      failed: 0,
      expired: 0,
      refunded: 0,
    }
    let collected = 0
    for (const p of payments) {
      counts[p.status] += 1
      if (p.status === 'success' && isThisMonth(p.paidAt, now)) collected += p.amount
    }
    return { counts, collected }
  }, [payments, now])

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (status && p.status !== status) return false
      if (method && p.method !== method) return false
      if (!q) return true
      return (
        p.providerReference.toLowerCase().includes(q) ||
        p.externalId.toLowerCase().includes(q) ||
        (tenantsById.get(p.tenantId)?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [payments, status, method, query, tenantsById])

  const actor = actorOf(user)

  const columns: Column<Payment>[] = [
    {
      key: 'ref',
      header: 'Xendit id',
      cell: (p) => (
        <div className="min-w-0">
          <Mono className="font-semibold">{p.providerReference}</Mono>
          <div>
            <Mono className="text-muted">{p.externalId}</Mono>
          </div>
        </div>
      ),
      sortValue: (p) => p.providerReference,
    },
    {
      key: 'tenant',
      header: 'Organization',
      cell: (p) => tenantsById.get(p.tenantId)?.name ?? p.tenantId,
      sortValue: (p) => tenantsById.get(p.tenantId)?.name ?? '',
    },
    {
      key: 'channel',
      header: 'Channel',
      cell: (p) => (
        <div>
          <p className="font-medium">{PAYMENT_CHANNEL_BY_ID[p.channel].label}</p>
          <p className="text-muted text-xs">{PAYMENT_METHOD_LABEL[p.method]}</p>
        </div>
      ),
      sortValue: (p) => PAYMENT_CHANNEL_BY_ID[p.channel].label,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <div className="tabular-nums">
          <p className="font-semibold">{fmtIdr(p.amount, p.currency)}</p>
          <p className="text-muted text-xs">Fee {fmtIdr(p.fee, p.currency)}</p>
        </div>
      ),
      sortValue: (p) => p.amount,
    },
    { key: 'status', header: 'Status', cell: (p) => <PaymentBadge status={p.status} /> },
    {
      key: 'created',
      header: 'Created',
      cell: (p) => fmtDateTime(p.createdAt),
      sortValue: (p) => p.createdAt,
    },
    {
      key: 'settled',
      header: 'Paid / expires',
      cell: (p) => {
        if (p.status === 'success') return fmtDateTime(p.paidAt)
        if (p.status === 'pending' && p.expiresAt) return `Expires ${fmtDateTime(p.expiresAt)}`
        return <span className="text-muted">—</span>
      },
      sortValue: (p) => p.paidAt ?? p.expiresAt ?? '',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Every Xendit payment request and what came back from it."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Create payment request
          </Button>
        }
      />

      <div className="space-y-4">
        <Banner
          tone="info"
          icon={<Webhook />}
          title="Xendit calls the backend webhook when a payment settles."
          description="This console reflects the resulting status. Subscription status, not payment status, decides access."
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Collected this month"
            value={fmtIdr(stats.collected)}
            hint="Current calendar month"
            icon={<CheckCircle2 />}
            tone="success"
          />
          <StatCard
            label="Waiting for payment"
            value={fmtNumber(stats.counts.pending)}
            hint="Open requests on Xendit"
            icon={<Clock />}
            tone="warning"
          />
          <StatCard
            label="Failed or expired"
            value={fmtNumber(stats.counts.failed + stats.counts.expired)}
            hint="Customer never completed"
            icon={<XCircle />}
            tone="danger"
          />
          <StatCard
            label="Refunded"
            value={fmtNumber(stats.counts.refunded)}
            hint="Invoice voided"
            icon={<RotateCcw />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)}
            className="w-full sm:w-48"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)}
            className="w-full sm:w-48"
            aria-label="Filter by method"
          >
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </Select>
          <Input
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Xendit id, invoice number or organization"
            className="[&_input]:shadow-card w-full sm:w-80 [&_input]:rounded-full [&_input]:border-0"
          />
        </div>

        <Card>
          <DataTable
            rows={visible}
            columns={columns}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/payments/${p.id}`)}
            rowActions={(p) =>
              p.status === 'pending' || p.status === 'success' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Payment actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.status === 'pending' ? (
                      PENDING_TRANSITIONS.map((t) => (
                        <DropdownMenuItem
                          key={t.status}
                          onSelect={() =>
                            dispatch({
                              type: 'payments/setStatus',
                              id: p.id,
                              status: t.status,
                              actor,
                            })
                          }
                        >
                          <t.icon /> {t.label}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem danger onSelect={() => setRefunding(p)}>
                        <RotateCcw /> Refund
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null
            }
            empty={{
              icon: <CreditCard />,
              title: payments.length === 0 ? 'No payments yet' : 'No payments match',
              description:
                payments.length === 0
                  ? 'Create a payment request against an open invoice to see the chain run.'
                  : 'Try another status or method, or clear the search.',
              action:
                payments.length === 0 ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                    Create payment request
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatus('')
                      setMethod('')
                      setQuery('')
                    }}
                  >
                    Clear filters
                  </Button>
                ),
            }}
          />
        </Card>
      </div>

      <SimulatePaymentDialog open={creating} onOpenChange={setCreating} />
      <RefundPaymentDialog
        payment={refunding}
        onOpenChange={(open) => (open ? undefined : setRefunding(null))}
      />
    </div>
  )
}
