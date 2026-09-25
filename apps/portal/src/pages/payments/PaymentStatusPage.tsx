import { fmtIdr } from '@scp/fixtures'
import { useFormat, useT, type DictKey } from '@scp/i18n'
import type { Payment, PaymentEventType, PaymentStatus } from '@scp/types'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  IconTile,
  Input,
  Kicker,
  KeyValue,
  StatusDot,
  Timeline,
  cn,
  type StatTone,
  type TimelineItem,
} from '@scp/ui'
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Receipt,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import * as React from 'react'
import { Link, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono, PaymentBadge } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'

const EVENT_TONE: Partial<Record<PaymentEventType, TimelineItem['tone']>> = {
  paid: 'success',
  expired: 'accent',
  failed: 'accent',
  callback: 'info',
}

const HERO_TONE: Record<PaymentStatus, StatTone> = {
  pending: 'warning',
  success: 'success',
  failed: 'danger',
  expired: 'default',
  refunded: 'default',
}
const HERO_ICON: Record<PaymentStatus, LucideIcon> = {
  pending: Clock,
  success: CheckCircle2,
  failed: XCircle,
  expired: XCircle,
  refunded: RotateCcw,
}

const VA_STEPS: DictKey[] = [
  'payment.va.step1',
  'payment.va.step2',
  'payment.va.step3',
  'payment.va.step4',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Seconds left until `iso`, ticking once a second; null when there is no expiry. */
function useCountdown(iso: string | null): number | null {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!iso) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [iso])
  if (!iso) return null
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000))
}

function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const t = useT()
  const seconds = useCountdown(expiresAt)
  if (seconds === null) return <p className="text-muted text-sm">{t('common.noExpiry')}</p>
  if (seconds === 0)
    return <p className="text-accent text-sm font-semibold">{t('payment.expired')}</p>
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return (
    <p
      className={cn(
        'text-sm tabular-nums',
        seconds < 300 ? 'text-accent font-semibold' : 'text-muted',
      )}
    >
      {t('payment.expiresIn', { time: `${pad(h)}:${pad(m)}:${pad(s)}` })}
    </p>
  )
}

function CopyButton({ value }: { value: string }) {
  const t = useT()
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; nothing to do */
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? t('payment.copied') : t('payment.copy')}
    </Button>
  )
}

const QR_SIZE = 25
const FINDERS = [
  [0, 0],
  [QR_SIZE - 7, 0],
  [0, QR_SIZE - 7],
] as const

function finderCell(x: number, y: number): boolean | null {
  for (const [fx, fy] of FINDERS) {
    const dx = x - fx
    const dy = y - fy
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) continue
    const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
    return ring !== 2
  }
  return null
}

/** QR-looking placeholder: finder squares plus cells hashed from the QRIS string. */
function QrPlaceholder({ value }: { value: string }) {
  const t = useT()
  const cells: string[] = []
  let h = 2166136261
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      h = Math.imul(h ^ value.charCodeAt((y * QR_SIZE + x) % value.length), 16777619) >>> 0
      const dark = finderCell(x, y) ?? (h >>> 7) % 2 === 0
      if (dark) cells.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  return (
    <svg
      viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`}
      role="img"
      aria-label={t('payment.qrisCode')}
      className="size-[200px] rounded-2xl bg-white"
    >
      <path d={cells.join('')} fill="#101112" />
    </svg>
  )
}

function CardForm({ onPay }: { onPay: () => void }) {
  const t = useT()
  const [number, setNumber] = React.useState('')
  const [expiry, setExpiry] = React.useState('')
  const [cvc, setCvc] = React.useState('')
  const ready = number.trim().length >= 12 && expiry.trim().length >= 4 && cvc.trim().length >= 3
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onPay()
      }}
    >
      <FormField label={t('payment.cardNumber')} htmlFor="card-number">
        <Input
          id="card-number"
          tone="nested"
          inputMode="numeric"
          autoComplete="off"
          placeholder="4111 1111 1111 1111"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('payment.cardExpiry')} htmlFor="card-expiry">
          <Input
            id="card-expiry"
            tone="nested"
            autoComplete="off"
            placeholder={t('payment.cardExpiryPlaceholder')}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </FormField>
        <FormField label={t('payment.cardCvc')} htmlFor="card-cvc">
          <Input
            id="card-cvc"
            tone="nested"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
          />
        </FormField>
      </div>
      <Button type="submit" disabled={!ready}>
        {t('payment.payNow')}
      </Button>
    </form>
  )
}

function Instructions({ payment, onCardPay }: { payment: Payment; onCardPay: () => void }) {
  const t = useT()
  const option = PAYMENT_CHANNEL_BY_ID[payment.channel]
  const { accountNumber, paymentCode, qrString, checkoutUrl } = payment.instructions
  switch (payment.method) {
    case 'virtual_account':
      return (
        <div className="space-y-4">
          <div className="bg-surface-2 rounded-2xl p-4">
            <Kicker>{option.label}</Kicker>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Mono className="text-xl font-semibold tracking-wider">{accountNumber}</Mono>
              {accountNumber ? <CopyButton value={accountNumber} /> : null}
            </div>
          </div>
          <ol className="space-y-2 text-sm">
            {VA_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="bg-ink text-on-ink flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                  {i + 1}
                </span>
                {t(step)}
              </li>
            ))}
          </ol>
        </div>
      )
    case 'retail':
      return (
        <div className="space-y-3">
          <div className="bg-surface-2 rounded-2xl p-4">
            <Kicker>{t('payment.paymentCode')}</Kicker>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Mono className="text-xl font-semibold tracking-wider">{paymentCode}</Mono>
              {paymentCode ? <CopyButton value={paymentCode} /> : null}
            </div>
          </div>
          <p className="text-sm">{t('payment.showAtCashier', { channel: option.label })}</p>
        </div>
      )
    case 'qris':
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <QrPlaceholder value={qrString ?? payment.providerReference} />
          <p className="text-sm font-semibold">{t('payment.scanQris')}</p>
          <Mono className="text-muted max-w-full truncate">{qrString}</Mono>
        </div>
      )
    case 'ewallet':
      return (
        <div className="space-y-3">
          <Button asChild>
            <a href={checkoutUrl ?? '#'} target="_blank" rel="noreferrer">
              <ExternalLink /> {t('payment.openWallet', { channel: option.label })}
            </a>
          </Button>
          <p className="text-sm">{t('payment.approveInApp')}</p>
        </div>
      )
    case 'card':
      return <CardForm onPay={onCardPay} />
  }
}

export function PaymentStatusPage() {
  const t = useT()
  const { formatDateTime } = useFormat()
  const { paymentId = '' } = useParams()
  const user = useCurrentUser()
  const { payments, invoicesById, subscriptionsById, applicationsById, dispatch } = useScoped()
  const [checked, setChecked] = React.useState(false)
  const payment = payments.find((p) => p.id === paymentId)

  if (!payment) {
    return (
      <Card>
        <EmptyState
          icon={<Receipt />}
          title={t('common.paymentNotFound')}
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

  const invoice = payment.invoiceId ? invoicesById.get(payment.invoiceId) : undefined
  const sub = subscriptionsById.get(payment.subscriptionId)
  const app = sub ? applicationsById.get(sub.applicationId) : undefined
  const option = PAYMENT_CHANNEL_BY_ID[payment.channel]
  const pending = payment.status === 'pending'
  const setStatus = (status: PaymentStatus) =>
    dispatch({ type: 'payments/setStatus', id: payment.id, status, actor: actorOf(user) })

  const HeroIcon = HERO_ICON[payment.status]

  const timeline: TimelineItem[] = payment.events.map((e, i) => ({
    id: `${e.at}-${i}`,
    when: formatDateTime(e.at),
    title: t(`paymentEvent.${e.type}`),
    note: e.note,
    tone: EVENT_TONE[e.type] ?? 'default',
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t('payment.title')}</h1>
          <p className="text-muted text-sm">
            <Mono>{payment.externalId}</Mono>
          </p>
        </div>
      </div>

      <div className="rounded-hero bg-card shadow-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <IconTile tone={HERO_TONE[payment.status]} size="lg">
            <HeroIcon />
          </IconTile>
          <div className="min-w-0 flex-1">
            <Kicker>{t(`payment.hero.${payment.status}`)}</Kicker>
            <p className="text-[34px] leading-tight font-bold tracking-tight tabular-nums sm:text-[44px]">
              {fmtIdr(payment.amount, payment.currency)}
            </p>
            {pending ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusDot tone="warning" label={t('payment.pending')} pulse />
                <Countdown expiresAt={payment.expiresAt} />
              </div>
            ) : null}
            {payment.status === 'success' ? (
              <p className="text-muted mt-2 text-sm">
                {t('payment.paidOn', { date: formatDateTime(payment.paidAt) })} ·{' '}
                <Mono>{payment.providerReference}</Mono>
              </p>
            ) : null}
            {payment.status === 'expired' || payment.status === 'failed' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {payment.invoiceId ? (
                  <Button asChild>
                    <Link to={`/billing/${payment.invoiceId}/pay`}>{t('payment.tryAgain')}</Link>
                  </Button>
                ) : null}
                <Button variant="outline" asChild>
                  <Link to="/billing">{t('common.backToBilling')}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {payment.status === 'success' && app ? (
        <Banner
          tone="success"
          icon={<CheckCircle2 />}
          title={t('payment.subscriptionActive', { app: app.name })}
          description={t('invoice.usersCanOpen')}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href={app.baseUrl} target="_blank" rel="noreferrer">
                  {t('common.openApp', { name: app.name })}
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/payments/${payment.id}/receipt`}>{t('common.receipt')}</Link>
              </Button>
              {payment.invoiceId ? (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/billing/${payment.invoiceId}/document`}>
                    {t('common.viewInvoice')}
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <Link to="/billing">{t('common.backToBilling')}</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      {pending ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('payment.instructions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Instructions payment={payment} onCardPay={() => setStatus('success')} />
            <div className="border-border flex flex-wrap items-center gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setChecked(true)}>
                {t('payment.checkStatus')}
              </Button>
              {checked ? <p className="text-muted text-xs">{t('payment.stillWaiting')}</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('payment.timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('payment.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={[
                { label: t('common.xenditId'), value: <Mono>{payment.providerReference}</Mono> },
                { label: t('common.externalId'), value: <Mono>{payment.externalId}</Mono> },
                {
                  label: t('common.method'),
                  value: `${t(`method.${payment.method}`)} · ${option.label}`,
                },
                {
                  label: t('common.amount'),
                  value: (
                    <span className="font-semibold">
                      {fmtIdr(payment.amount, payment.currency)}
                    </span>
                  ),
                },
                { label: t('common.created'), value: formatDateTime(payment.createdAt) },
                {
                  label: t('common.expires'),
                  value: payment.expiresAt
                    ? formatDateTime(payment.expiresAt)
                    : t('common.noExpiry'),
                },
                { label: t('common.status'), value: <PaymentBadge status={payment.status} /> },
                {
                  label: t('common.invoice'),
                  value: invoice ? (
                    <Link to={`/billing/${invoice.id}`} className="text-accent font-semibold">
                      {invoice.number}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {pending ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('payment.simulate')}</CardTitle>
            <CardDescription>{t('payment.simulateDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatus('success')}>
              {t('payment.simulatePaid')}
            </Button>
            <Button variant="outline" onClick={() => setStatus('expired')}>
              {t('payment.simulateExpired')}
            </Button>
            <Button variant="outline" onClick={() => setStatus('failed')}>
              {t('payment.simulateFailed')}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
