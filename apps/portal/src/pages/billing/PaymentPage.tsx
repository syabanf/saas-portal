import { fmtDate, fmtIdr, paymentFee } from '@scp/fixtures'
import type { PaymentChannel, PaymentChannelOption, PaymentMethod } from '@scp/types'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNELS, PAYMENT_METHOD_LABEL } from '@scp/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Kicker,
  SectionTitle,
  cn,
} from '@scp/ui'
import { FileText } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'

const METHOD_ORDER: PaymentMethod[] = ['virtual_account', 'ewallet', 'qris', 'card', 'retail']

function validFor(minutes: number | null): string {
  if (minutes === null) return 'No expiry'
  return minutes >= 60 ? `Valid ${minutes / 60} hours` : `Valid ${minutes} minutes`
}

function monogram({ channel, method }: PaymentChannelOption): string {
  if (method === 'qris') return 'QR'
  if (method === 'card') return 'CC'
  return channel.slice(0, 3)
}

/** Xendit-style checkout: pick a channel, then the status page shows the instructions. */
export function PaymentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { invoicesById, subscriptionsById, applicationsById, payments, dispatch } = useScoped()
  const [channel, setChannel] = React.useState<PaymentChannel | null>(null)
  const [requestedAt, setRequestedAt] = React.useState<string | null>(null)
  const invoice = invoicesById.get(id)
  const payable = invoice?.status === 'open' || invoice?.status === 'overdue'

  React.useEffect(() => {
    if (!requestedAt || !invoice) return
    const created = payments.find(
      (p) => p.invoiceId === invoice.id && p.status === 'pending' && p.createdAt >= requestedAt,
    )
    if (created) navigate(`/payments/${created.id}`, { replace: true })
  }, [requestedAt, payments, invoice, navigate])

  if (!invoice || !payable) {
    return (
      <Card>
        <EmptyState
          icon={<FileText />}
          title={invoice ? 'Nothing to pay' : 'Invoice not found'}
          description={
            invoice
              ? 'This invoice is already settled or no longer open.'
              : 'It may belong to another organization or has been removed.'
          }
          action={
            <Button variant="outline" asChild>
              <Link to="/billing">Back to billing</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  const sub = subscriptionsById.get(invoice.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const fee = channel ? paymentFee(channel, invoice.total) : 0
  const total = invoice.total + fee

  const pay = () => {
    if (!channel) return
    setRequestedAt(new Date().toISOString())
    dispatch({ type: 'payments/create', invoiceId: invoice.id, channel, actor: actorOf(user) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Pay invoice</h1>
          <p className="text-muted text-sm">
            <Mono>{invoice.number}</Mono>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Choose how to pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {METHOD_ORDER.map((method) => (
              <section key={method} className="space-y-2">
                <SectionTitle>{PAYMENT_METHOD_LABEL[method]}</SectionTitle>
                {PAYMENT_CHANNELS.filter((c) => c.method === method).map((option) => {
                  const selected = option.channel === channel
                  return (
                    <button
                      key={option.channel}
                      type="button"
                      onClick={() => setChannel(option.channel)}
                      className={cn(
                        'hover:bg-surface flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                        selected ? 'border-accent bg-accent-soft/40' : 'border-border bg-card',
                      )}
                    >
                      <span className="bg-ink text-on-ink flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-wider">
                        {monogram(option)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="text-muted block text-xs">
                          Fee {fmtIdr(paymentFee(option.channel, invoice.total), invoice.currency)}{' '}
                          · {validFor(option.expiresInMinutes)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                          selected ? 'border-accent' : 'border-silver',
                        )}
                      >
                        {selected ? <span className="bg-accent size-2.5 rounded-full" /> : null}
                      </span>
                    </button>
                  )
                })}
              </section>
            ))}
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-0">
          <CardHeader>
            <Kicker>Summary</Kicker>
            <CardTitle>
              {app?.name ?? sub?.applicationId ?? 'Subscription'}
              {sub ? ` · ${BILLING_PERIOD_LABEL[invoice.billingPeriod ?? sub.billingPeriod]}` : ''}
            </CardTitle>
            <Mono>{invoice.number}</Mono>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-border divide-y text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Amount</dt>
                <dd className="tabular-nums">{fmtIdr(invoice.total, invoice.currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Fee</dt>
                <dd className="tabular-nums">
                  {channel ? fmtIdr(fee, invoice.currency) : 'Select a channel'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Total</dt>
                <dd className="text-2xl font-bold tabular-nums">
                  {fmtIdr(total, invoice.currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">Due</dt>
                <dd>{fmtDate(invoice.dueDate)}</dd>
              </div>
            </dl>
            <Button className="w-full" size="lg" disabled={!channel} onClick={pay}>
              Pay {fmtIdr(total, invoice.currency)}
            </Button>
            <p className="text-muted text-xs">
              Payments are processed by Xendit. You will get instructions on the next screen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
