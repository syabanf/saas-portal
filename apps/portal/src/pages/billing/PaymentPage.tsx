import { fmtIdr } from '@scp/fixtures'
import { useFormat, useT, type Translate } from '@scp/i18n'
import type { PaymentChannel, PaymentChannelOption, PaymentMethod } from '@scp/types'
import { PAYMENT_CHANNELS } from '@scp/types'
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

function validFor(t: Translate, minutes: number | null): string {
  if (minutes === null) return t('common.noExpiry')
  return minutes >= 60
    ? t('pay.validHours', { count: minutes / 60 })
    : t('pay.validMinutes', { count: minutes })
}

function monogram({ channel, method }: PaymentChannelOption): string {
  if (method === 'qris') return 'QR'
  if (method === 'card') return 'CC'
  return channel.slice(0, 3)
}

/** Xendit-style checkout: pick a channel, then the status page shows the instructions. */
export function PaymentPage() {
  const t = useT()
  const { formatDate } = useFormat()
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
          title={invoice ? t('pay.nothingToPay') : t('common.invoiceNotFound')}
          description={invoice ? t('pay.nothingToPayDescription') : t('common.notFoundDescription')}
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

  const pay = () => {
    if (!channel) return
    setRequestedAt(new Date().toISOString())
    dispatch({ type: 'payments/create', invoiceId: invoice.id, channel, actor: actorOf(user) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t('pay.title')}</h1>
          <p className="text-muted text-sm">
            <Mono>{invoice.number}</Mono>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t('pay.chooseHow')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {METHOD_ORDER.map((method) => (
              <section key={method} className="space-y-2">
                <SectionTitle>{t(`method.${method}`)}</SectionTitle>
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
                          {validFor(t, option.expiresInMinutes)}
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
            <Kicker>{t('pay.summary')}</Kicker>
            <CardTitle>
              {app?.name ?? sub?.applicationId ?? t('common.subscription')}
              {sub ? ` · ${t(`period.${invoice.billingPeriod ?? sub.billingPeriod}`)}` : ''}
            </CardTitle>
            <Mono>{invoice.number}</Mono>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-border divide-y text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">{t('common.total')}</dt>
                <dd className="text-2xl font-bold tabular-nums">
                  {fmtIdr(invoice.total, invoice.currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">{t('common.due')}</dt>
                <dd>{formatDate(invoice.dueDate)}</dd>
              </div>
            </dl>
            <Button className="w-full" size="lg" disabled={!channel} onClick={pay}>
              {t('pay.button', { amount: fmtIdr(invoice.total, invoice.currency) })}
            </Button>
            <p className="text-muted text-xs">{t('pay.processedBy')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
