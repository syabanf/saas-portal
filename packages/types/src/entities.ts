import type {
  AccessDecision,
  AccessPolicyMode,
  AccessReason,
  ApiClientStatus,
  ApplicationStatus,
  ApplicationType,
  AuditAction,
  AuthMode,
  BillingPeriod,
  DeliveryStatus,
  Environment,
  EventType,
  IntegrationHealth,
  InvoiceStatus,
  PaymentChannel,
  PaymentEventType,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
  TenantStatus,
  UserStatus,
  WebhookStatus,
  WorkspaceRole,
} from './enums'

/** ISO-8601 timestamp string. */
export type Iso = string

export interface Tenant {
  id: string
  name: string
  code: string
  status: TenantStatus
  billingEmail: string
  country: string
  createdAt: Iso
  updatedAt: Iso
}

export interface User {
  id: string
  email: string
  name: string
  status: UserStatus
  platformAdmin: boolean
  createdAt: Iso
  updatedAt: Iso
}

/** Membership of a user in a tenant plus the applications they may enter (blueprint §39). */
export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  workspaceRole: WorkspaceRole
  status: UserStatus
  applicationIds: string[]
  invitationToken?: string
  invitationExpiresAt?: Iso
  invitationAcceptedAt?: Iso
}

export interface Application {
  id: string
  name: string
  code: string
  baseUrl: string
  type: ApplicationType
  status: ApplicationStatus
  authMode: AuthMode
  accessPolicy: AccessPolicyMode
  allowedStatuses: SubscriptionStatus[]
  /** Price per billing period; 0 means the period is not offered. */
  priceMonthly: number
  priceAnnual: number
  currency: string
  trialDays: number
  tokenLifetimeMinutes: number
  audience: string
  issuer: string
  callbackUrl: string
  health: IntegrationHealth
  lastSuccessAt: Iso | null
  lastFailure: string | null
  createdAt: Iso
  updatedAt: Iso
}

export interface Subscription {
  id: string
  tenantId: string
  applicationId: string
  billingPeriod: BillingPeriod
  /** Price snapshot taken from the application when the subscription was created. */
  price: number
  currency: string
  status: SubscriptionStatus
  startedAt: Iso
  currentPeriodStart: Iso
  currentPeriodEnd: Iso
  gracePeriodEnd: Iso | null
  cancelAtPeriodEnd: boolean
  scheduledChange?: { billingPeriod: BillingPeriod; price: number; effectiveAt: Iso } | null
  createdAt: Iso
  updatedAt: Iso
}

export interface SubscriptionEvent {
  id: string
  subscriptionId: string
  at: Iso
  type: EventType
  label: string
  note: string | null
}

export interface ApiClient {
  id: string
  applicationId: string
  environment: Environment
  name: string
  clientId: string
  /** Last four characters of the secret; the secret itself is shown once at creation. */
  secretHint: string
  status: ApiClientStatus
  allowedRedirectUris: string[]
  allowedScopes: string[]
  createdAt: Iso
  rotatedAt: Iso | null
}

export interface InvoiceLine {
  description: string
  amount: number
}

export interface Invoice {
  billingPeriod?: BillingPeriod
  id: string
  tenantId: string
  subscriptionId: string
  number: string
  status: InvoiceStatus
  issuedAt: Iso
  dueDate: Iso
  paidAt: Iso | null
  /** Billing period the invoice covers. */
  periodStart: Iso
  periodEnd: Iso
  /** VAT rate applied to the subtotal (0.11 = PPN 11%). */
  taxRate: number
  /** Subtotal + tax. */
  total: number
  currency: string
  lines: InvoiceLine[]
}

export interface PaymentEvent {
  at: Iso
  type: PaymentEventType
  note: string | null
}

/** What the payer needs to complete the payment; fields depend on the method. */
export interface PaymentInstructions {
  accountNumber: string | null
  qrString: string | null
  paymentCode: string | null
  checkoutUrl: string | null
  cardLast4: string | null
}

/** A payment request on the provider (Xendit) and its outcome. */
export interface Payment {
  id: string
  tenantId: string
  subscriptionId: string
  invoiceId: string | null
  provider: string
  /** Provider id, e.g. xnd_inv_… */
  providerReference: string
  /** Our reference sent to the provider (the invoice number). */
  externalId: string
  method: PaymentMethod
  channel: PaymentChannel
  amount: number
  fee: number
  currency: string
  status: PaymentStatus
  instructions: PaymentInstructions
  expiresAt: Iso | null
  paidAt: Iso | null
  createdAt: Iso
  events: PaymentEvent[]
}

export interface WebhookEndpoint {
  id: string
  applicationId: string
  url: string
  events: EventType[]
  status: WebhookStatus
  secretHint: string
  createdAt: Iso
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  event: EventType
  status: DeliveryStatus
  httpStatus: number | null
  latencyMs: number | null
  attempt: number
  maxAttempts: number
  at: Iso
  payload: string
  response: string | null
}

export interface AccessLog {
  id: string
  requestId: string
  at: Iso
  tenantId: string
  userId: string
  applicationId: string
  subscriptionId: string | null
  decision: AccessDecision
  reason: AccessReason
  warning: AccessReason | null
  latencyMs: number
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  tenantId: string | null
  action: AuditAction
  resourceType: string
  resourceId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  requestId: string | null
  sourceIp: string | null
  at: Iso
}

export interface Session {
  id: string
  userId: string
  tenantId: string
  createdAt: Iso
  expiresAt: Iso
  lastSeenAt: Iso
  ip: string
  userAgent: string
  revoked: boolean
}
