import { fmtDate, fmtIdr } from '@scp/fixtures'
import type { Subscription, SubscriptionStatus } from '@scp/types'
import { Button, cn } from '@scp/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { InvoiceBadge, Mono, PaymentBadge, PaymentChannelLabel } from '../../components/badges'
import { useScoped } from '../../state/app-state'

const MAX_ROWS = 5
/** Statuses where the tenant needs to see the money trail without opening the section first. */
const EXPANDED_BY_DEFAULT = new Set<SubscriptionStatus>(['past_due', 'grace_period', 'suspended'])

/** Open invoice plus the latest payments of one subscription, folded behind a toggle inside its card. */
export function PaymentHistoryList({ subscription }: { subscription: Subscription }) {
  const { payments, invoices } = useScoped()
  const history = payments
    .filter((p) => p.subscriptionId === subscription.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const dueInvoice = invoices
    .filter(
      (i) =>
        i.subscriptionId === subscription.id && (i.status === 'open' || i.status === 'overdue'),
    )
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]
  const [open, setOpen] = React.useState(
    EXPANDED_BY_DEFAULT.has(subscription.status) || dueInvoice !== undefined,
  )
  const panelId = `payment-history-${subscription.id}`

  return (
    <div className="border-border border-t pt-4 text-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 pb-1 text-xs font-semibold transition-colors',
          open
            ? 'border-accent text-foreground'
            : 'text-muted hover:text-foreground border-transparent',
        )}
      >
        Payment history ({history.length})
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div id={panelId} className="mt-3 space-y-1">
          {dueInvoice ? (
            <div className="bg-surface-2 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5">
              <span className="flex min-w-0 flex-1 basis-40 flex-col">
                <Mono className="font-semibold">{dueInvoice.number}</Mono>
                <span className="text-muted text-xs">Due {fmtDate(dueInvoice.dueDate)}</span>
              </span>
              <span className="font-semibold tabular-nums">
                {fmtIdr(dueInvoice.total, dueInvoice.currency)}
              </span>
              <InvoiceBadge status={dueInvoice.status} />
              <Button size="sm" className="ml-auto" asChild>
                <Link to={`/billing/${dueInvoice.id}/pay`}>Pay</Link>
              </Button>
            </div>
          ) : null}
          {history.length === 0 ? (
            <p className="text-muted px-3 py-2">No payments yet.</p>
          ) : (
            history.slice(0, MAX_ROWS).map((payment) => (
              <Link
                key={payment.id}
                to={`/payments/${payment.id}`}
                className="hover:bg-surface-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-3 py-2.5"
              >
                <PaymentChannelLabel payment={payment} className="min-w-0 flex-1 basis-40" />
                <span className="font-semibold tabular-nums">
                  {fmtIdr(payment.amount + payment.fee, payment.currency)}
                </span>
                <ChevronRight className="text-muted size-4 sm:order-last" />
                <span className="flex w-full items-center gap-2 sm:w-auto">
                  <PaymentBadge status={payment.status} />
                  <span className="text-muted text-xs">
                    {fmtDate(payment.status === 'success' ? payment.paidAt : payment.createdAt)}
                  </span>
                  {payment.status === 'pending' ? (
                    <span className="text-accent text-xs font-semibold">Continue</span>
                  ) : null}
                </span>
              </Link>
            ))
          )}
          {history.length > MAX_ROWS ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/billing">View all in Billing</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
