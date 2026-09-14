export type TenantStatus = 'active' | 'suspended' | 'pending'
export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending activation',
}

export type UserStatus = 'active' | 'invited' | 'disabled'
export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  disabled: 'Disabled',
}

export type WorkspaceRole = 'workspace_admin' | 'member'
export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  workspace_admin: 'Workspace admin',
  member: 'Member',
}

export type ApplicationType = 'web' | 'mobile' | 'backend' | 'external'
export const APPLICATION_TYPE_LABEL: Record<ApplicationType, string> = {
  web: 'Web application',
  mobile: 'Mobile application',
  backend: 'Backend service',
  external: 'External integration',
}

export type ApplicationStatus = 'active' | 'disabled' | 'draft'
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  draft: 'Draft',
}

export type AuthMode = 'sso' | 'own_login' | 'service_only'
export const AUTH_MODE_LABEL: Record<AuthMode, string> = {
  sso: 'Login through SaaS Platform',
  own_login: 'Application has its own login',
  service_only: 'Service-to-service only',
}

export type AccessPolicyMode = 'subscription' | 'free' | 'manual'
export const ACCESS_POLICY_LABEL: Record<AccessPolicyMode, string> = {
  subscription: 'Subscription required',
  free: 'Free for all workspace users',
  manual: 'Manual access',
}

export type Environment = 'development' | 'staging' | 'production'
export const ENVIRONMENT_LABEL: Record<Environment, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
}
export const ENVIRONMENTS: Environment[] = ['development', 'staging', 'production']

export type BillingPeriod = 'monthly' | 'annual'
export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'annual']
export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
}

export type SubscriptionStatus =
  'draft' | 'trial' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'cancelled' | 'expired'
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'draft',
  'trial',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'cancelled',
  'expired',
]
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  draft: 'Draft',
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  grace_period: 'Grace period',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

/** Default commercial access policy per subscription status (blueprint §25). */
export type AccessPolicyOutcome = 'allow' | 'allow_warning' | 'allow_until_end' | 'deny'
export const SUBSCRIPTION_ACCESS_POLICY: Record<SubscriptionStatus, AccessPolicyOutcome> = {
  draft: 'deny',
  trial: 'allow',
  active: 'allow',
  past_due: 'allow_warning',
  grace_period: 'allow_warning',
  suspended: 'deny',
  cancelled: 'allow_until_end',
  expired: 'deny',
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded'
export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'success',
  'failed',
  'expired',
  'refunded',
]
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Waiting for payment',
  success: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  refunded: 'Refunded',
}

/** Payment methods offered through the Xendit-style checkout. */
export type PaymentMethod = 'virtual_account' | 'ewallet' | 'qris' | 'card' | 'retail'
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  virtual_account: 'Virtual account',
  ewallet: 'E-wallet',
  qris: 'QRIS',
  card: 'Credit or debit card',
  retail: 'Retail outlet',
}

export type PaymentChannel =
  | 'BCA'
  | 'BNI'
  | 'BRI'
  | 'MANDIRI'
  | 'PERMATA'
  | 'OVO'
  | 'DANA'
  | 'SHOPEEPAY'
  | 'LINKAJA'
  | 'QRIS'
  | 'CARD'
  | 'ALFAMART'
  | 'INDOMARET'

export interface PaymentChannelOption {
  channel: PaymentChannel
  method: PaymentMethod
  label: string
  /** Minutes until the payment request expires; null = no expiry. */
  expiresInMinutes: number | null
}

export const PAYMENT_CHANNELS: PaymentChannelOption[] = [
  {
    channel: 'BCA',
    method: 'virtual_account',
    label: 'BCA Virtual Account',
    expiresInMinutes: 24 * 60,
  },
  {
    channel: 'BNI',
    method: 'virtual_account',
    label: 'BNI Virtual Account',
    expiresInMinutes: 24 * 60,
  },
  {
    channel: 'BRI',
    method: 'virtual_account',
    label: 'BRI Virtual Account',
    expiresInMinutes: 24 * 60,
  },
  {
    channel: 'MANDIRI',
    method: 'virtual_account',
    label: 'Mandiri Virtual Account',
    expiresInMinutes: 24 * 60,
  },
  {
    channel: 'PERMATA',
    method: 'virtual_account',
    label: 'Permata Virtual Account',
    expiresInMinutes: 24 * 60,
  },
  { channel: 'OVO', method: 'ewallet', label: 'OVO', expiresInMinutes: 15 },
  { channel: 'DANA', method: 'ewallet', label: 'DANA', expiresInMinutes: 15 },
  { channel: 'SHOPEEPAY', method: 'ewallet', label: 'ShopeePay', expiresInMinutes: 15 },
  { channel: 'LINKAJA', method: 'ewallet', label: 'LinkAja', expiresInMinutes: 15 },
  { channel: 'QRIS', method: 'qris', label: 'QRIS', expiresInMinutes: 30 },
  { channel: 'CARD', method: 'card', label: 'Visa, Mastercard, JCB', expiresInMinutes: null },
  { channel: 'ALFAMART', method: 'retail', label: 'Alfamart', expiresInMinutes: 48 * 60 },
  { channel: 'INDOMARET', method: 'retail', label: 'Indomaret', expiresInMinutes: 48 * 60 },
]
export const PAYMENT_CHANNEL_BY_ID: Record<PaymentChannel, PaymentChannelOption> =
  Object.fromEntries(PAYMENT_CHANNELS.map((c) => [c.channel, c])) as Record<
    PaymentChannel,
    PaymentChannelOption
  >

export type PaymentEventType =
  'created' | 'pending' | 'callback' | 'paid' | 'expired' | 'failed' | 'refunded'
export const PAYMENT_EVENT_LABEL: Record<PaymentEventType, string> = {
  created: 'Payment request created',
  pending: 'Waiting for payment',
  callback: 'Callback received from Xendit',
  paid: 'Payment received',
  expired: 'Payment request expired',
  failed: 'Payment failed',
  refunded: 'Payment refunded',
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'overdue' | 'void'
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
}

export type ApiClientStatus = 'active' | 'revoked'
export type WebhookStatus = 'active' | 'paused'
export type DeliveryStatus = 'success' | 'failed' | 'retrying' | 'pending'
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  success: 'Delivered',
  failed: 'Failed',
  retrying: 'Retrying',
  pending: 'Pending',
}

export type IntegrationHealth = 'healthy' | 'degraded' | 'offline'
export const HEALTH_LABEL: Record<IntegrationHealth, string> = {
  healthy: 'Healthy',
  degraded: 'Webhook error',
  offline: 'Offline',
}

export type AccessDecision = 'allow' | 'deny'

/** Standardised reason codes (blueprint §58). */
export type AccessReason =
  | 'OK'
  | 'NO_SUBSCRIPTION'
  | 'SUBSCRIPTION_DRAFT'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'PAYMENT_PAST_DUE'
  | 'PAYMENT_REQUIRED'
  | 'TENANT_SUSPENDED'
  | 'APPLICATION_DISABLED'
  | 'USER_NOT_ASSIGNED'
  | 'USER_DISABLED'
  | 'INVALID_AUDIENCE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'

export const ACCESS_REASON_LABEL: Record<AccessReason, string> = {
  OK: 'Access granted',
  NO_SUBSCRIPTION: 'No active subscription',
  SUBSCRIPTION_DRAFT: 'Subscription not started',
  SUBSCRIPTION_EXPIRED: 'Subscription expired',
  SUBSCRIPTION_SUSPENDED: 'Subscription suspended',
  SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
  PAYMENT_PAST_DUE: 'Payment past due',
  PAYMENT_REQUIRED: 'Payment required',
  TENANT_SUSPENDED: 'Organization suspended',
  APPLICATION_DISABLED: 'Application disabled',
  USER_NOT_ASSIGNED: 'User not assigned to this application',
  USER_DISABLED: 'User disabled',
  INVALID_AUDIENCE: 'Token issued for another application',
  TOKEN_EXPIRED: 'Token expired',
  TOKEN_REVOKED: 'Token revoked',
}

export type EventType =
  | 'tenant.created'
  | 'tenant.suspended'
  | 'tenant.reactivated'
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.updated'
  | 'subscription.renewed'
  | 'subscription.past_due'
  | 'subscription.grace_started'
  | 'subscription.suspended'
  | 'subscription.cancelled'
  | 'subscription.expired'
  | 'payment.created'
  | 'payment.pending'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refunded'
  | 'application.created'
  | 'application.updated'
  | 'api_client.created'
  | 'api_client.rotated'
  | 'api_client.revoked'
  | 'access.allowed'
  | 'access.denied'
  | 'session.revoked'

export const EVENT_TYPES: EventType[] = [
  'tenant.created',
  'tenant.suspended',
  'tenant.reactivated',
  'subscription.created',
  'subscription.activated',
  'subscription.updated',
  'subscription.renewed',
  'subscription.past_due',
  'subscription.grace_started',
  'subscription.suspended',
  'subscription.cancelled',
  'subscription.expired',
  'payment.created',
  'payment.pending',
  'payment.success',
  'payment.failed',
  'payment.refunded',
  'application.created',
  'application.updated',
  'api_client.created',
  'api_client.rotated',
  'api_client.revoked',
  'access.allowed',
  'access.denied',
  'session.revoked',
]

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.suspended'
  | 'tenant.reactivated'
  | 'subscription.period_changed'
  | 'subscription.changed'
  | 'subscription.cancelled'
  | 'subscription.reactivated'
  | 'payment.status_changed'
  | 'invoice.generated'
  | 'api_client.created'
  | 'api_client.rotated'
  | 'api_client.revoked'
  | 'webhook.created'
  | 'webhook.retried'
  | 'access.allowed'
  | 'access.denied'
  | 'session.revoked'
  | 'manual.reactivation'

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'user.login': 'User logged in',
  'user.logout': 'User logged out',
  'tenant.created': 'Organization created',
  'tenant.updated': 'Organization updated',
  'tenant.suspended': 'Organization suspended',
  'tenant.reactivated': 'Organization reactivated',
  'subscription.period_changed': 'Billing period changed',
  'subscription.changed': 'Subscription changed',
  'subscription.cancelled': 'Subscription cancelled',
  'subscription.reactivated': 'Subscription reactivated',
  'payment.status_changed': 'Payment status changed',
  'invoice.generated': 'Invoice generated',
  'api_client.created': 'API client created',
  'api_client.rotated': 'API client rotated',
  'api_client.revoked': 'API client revoked',
  'webhook.created': 'Webhook created',
  'webhook.retried': 'Webhook retried',
  'access.allowed': 'Access allowed',
  'access.denied': 'Access denied',
  'session.revoked': 'Session revoked',
  'manual.reactivation': 'Manual reactivation',
}

export type SdkStack = 'node' | 'next' | 'go' | 'php' | 'flutter' | 'rest'
export const SDK_STACK_LABEL: Record<SdkStack, string> = {
  node: 'Node.js',
  next: 'Next.js',
  go: 'Go',
  php: 'PHP',
  flutter: 'Flutter',
  rest: 'REST API',
}

/** What an application card shows for the current member (portal launcher, blueprint §43). */
export type AppAccessState =
  | 'active'
  | 'trial'
  | 'payment_required'
  | 'suspended'
  | 'expired'
  | 'not_subscribed'
  | 'not_assigned'
  | 'disabled'
export const APP_ACCESS_STATE_LABEL: Record<AppAccessState, string> = {
  active: 'Active',
  trial: 'Trial',
  payment_required: 'Payment required',
  suspended: 'Suspended',
  expired: 'Expired',
  not_subscribed: 'Not subscribed',
  not_assigned: 'Not assigned to you',
  disabled: 'Unavailable',
}
