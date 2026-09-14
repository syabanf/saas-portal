import type {
  AccessDecision,
  ApplicationType,
  InvoiceStatus,
  Payment,
  PaymentStatus,
  SubscriptionStatus,
  UserStatus,
} from '@scp/types'
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_CHANNEL_BY_ID,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  USER_STATUS_LABEL,
} from '@scp/types'
import { Badge, cn, type BadgeTone } from '@scp/ui'
import { Cable, Globe, Server, Smartphone } from 'lucide-react'
import type * as React from 'react'

export const SUBSCRIPTION_TONE: Record<SubscriptionStatus, BadgeTone> = {
  draft: 'muted',
  trial: 'info',
  active: 'success',
  past_due: 'warning',
  grace_period: 'warning',
  suspended: 'danger',
  cancelled: 'default',
  expired: 'muted',
}

export function SubscriptionBadge({
  status,
  dot = true,
}: {
  status: SubscriptionStatus
  dot?: boolean
}) {
  return (
    <Badge variant={SUBSCRIPTION_TONE[status]} dot={dot}>
      {SUBSCRIPTION_STATUS_LABEL[status]}
    </Badge>
  )
}

const USER_TONE: Record<UserStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  disabled: 'muted',
}
export function UserBadge({ status }: { status: UserStatus }) {
  return <Badge variant={USER_TONE[status]}>{USER_STATUS_LABEL[status]}</Badge>
}

const INVOICE_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'muted',
  open: 'info',
  paid: 'success',
  overdue: 'danger',
  void: 'default',
}
export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={INVOICE_TONE[status]}>{INVOICE_STATUS_LABEL[status]}</Badge>
}

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  pending: 'warning',
  success: 'success',
  failed: 'danger',
  expired: 'muted',
  refunded: 'default',
}
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>
}

/** Channel name over its muted method, the way the billing table and payment lists show a payment. */
export function PaymentChannelLabel({
  payment,
  className,
}: {
  payment: Pick<Payment, 'channel' | 'method'>
  className?: string
}) {
  return (
    <span className={cn('flex flex-col', className)}>
      <span className="font-semibold">{PAYMENT_CHANNEL_BY_ID[payment.channel].label}</span>
      <span className="text-muted text-xs">{PAYMENT_METHOD_LABEL[payment.method]}</span>
    </span>
  )
}

export function DecisionBadge({ decision }: { decision: AccessDecision }) {
  return (
    <Badge variant={decision === 'allow' ? 'success' : 'danger'} dot>
      {decision === 'allow' ? 'Allow' : 'Deny'}
    </Badge>
  )
}

export function AppTypeIcon({ type }: { type: ApplicationType }) {
  switch (type) {
    case 'web':
      return <Globe />
    case 'mobile':
      return <Smartphone />
    case 'backend':
      return <Server />
    case 'external':
      return <Cable />
  }
}

/** Monospace identifier, the only place monospace is allowed outside code blocks. */
export function Mono({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <code className={`text-body font-mono text-xs ${className}`}>{children}</code>
}
