import type {
  AccessDecision,
  ApplicationType,
  DeliveryStatus,
  Environment,
  IntegrationHealth,
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
  TenantStatus,
  UserStatus,
} from '@scp/types'
import {
  APPLICATION_TYPE_LABEL,
  DELIVERY_STATUS_LABEL,
  ENVIRONMENT_LABEL,
  HEALTH_LABEL,
  INVOICE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
  TENANT_STATUS_LABEL,
  USER_STATUS_LABEL,
} from '@scp/types'
import { Badge, StatusDot, type BadgeTone } from '@scp/ui'
import { Cable, Globe, Server, Smartphone } from 'lucide-react'

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

export function SubscriptionStatusDot({ status }: { status: SubscriptionStatus }) {
  return <StatusDot tone={SUBSCRIPTION_TONE[status]} label={SUBSCRIPTION_STATUS_LABEL[status]} />
}

const TENANT_TONE: Record<TenantStatus, BadgeTone> = {
  active: 'success',
  suspended: 'danger',
  pending: 'info',
}
export function TenantBadge({ status }: { status: TenantStatus }) {
  return (
    <Badge variant={TENANT_TONE[status]} dot>
      {TENANT_STATUS_LABEL[status]}
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

const HEALTH_TONE: Record<IntegrationHealth, BadgeTone> = {
  healthy: 'success',
  degraded: 'warning',
  offline: 'danger',
}
export function HealthBadge({ health }: { health: IntegrationHealth }) {
  return (
    <Badge variant={HEALTH_TONE[health]} dot>
      {HEALTH_LABEL[health]}
    </Badge>
  )
}
export function HealthDot({ health }: { health: IntegrationHealth }) {
  return (
    <StatusDot
      tone={HEALTH_TONE[health]}
      label={HEALTH_LABEL[health]}
      pulse={health === 'offline'}
    />
  )
}

const DELIVERY_TONE: Record<DeliveryStatus, BadgeTone> = {
  success: 'success',
  failed: 'danger',
  retrying: 'warning',
  pending: 'muted',
}
export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  return <Badge variant={DELIVERY_TONE[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>
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

export function DecisionBadge({ decision }: { decision: AccessDecision }) {
  return (
    <Badge variant={decision === 'allow' ? 'success' : 'danger'} dot>
      {decision === 'allow' ? 'Allow' : 'Deny'}
    </Badge>
  )
}

const ENV_TONE: Record<Environment, BadgeTone> = {
  development: 'muted',
  staging: 'info',
  production: 'ink',
}
export function EnvBadge({ environment }: { environment: Environment }) {
  return <Badge variant={ENV_TONE[environment]}>{ENVIRONMENT_LABEL[environment]}</Badge>
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

export function AppTypeLabel({ type }: { type: ApplicationType }) {
  return <>{APPLICATION_TYPE_LABEL[type]}</>
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
