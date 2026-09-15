import type {
  AccessLog,
  ApiClient,
  Application,
  AuditAction,
  AuditLog,
  EventType,
  Invoice,
  Payment,
  PaymentChannel,
  PaymentStatus,
  Session,
  Subscription,
  SubscriptionEvent,
  SubscriptionStatus,
  Tenant,
  TenantMember,
  TenantStatus,
  User,
  WebhookDelivery,
  WebhookEndpoint,
} from '@scp/types'
import { BILLING_PERIOD_LABEL, PAYMENT_CHANNEL_BY_ID, SUBSCRIPTION_STATUS_LABEL } from '@scp/types'
import type { BillingPeriod } from '@scp/types'
import { newId, requestId } from './ids'
import { buildPaymentRequest } from './payments'
import { buildInvoice, nextInvoiceNumber } from './invoices'

export interface AppState {
  tenants: Tenant[]
  users: User[]
  members: TenantMember[]
  applications: Application[]
  subscriptions: Subscription[]
  subscriptionEvents: SubscriptionEvent[]
  apiClients: ApiClient[]
  webhooks: WebhookEndpoint[]
  deliveries: WebhookDelivery[]
  invoices: Invoice[]
  payments: Payment[]
  accessLogs: AccessLog[]
  auditLogs: AuditLog[]
  sessions: Session[]
}

export interface Actor {
  id: string
  name: string
}

interface Meta {
  actor: Actor
  at?: string
}

export type AppAction =
  | ({ type: 'tenants/upsert'; tenant: Tenant } & Meta)
  | ({ type: 'tenants/remove'; id: string } & Meta)
  | ({ type: 'tenants/setStatus'; id: string; status: TenantStatus } & Meta)
  | { type: 'users/upsert'; user: User }
  | { type: 'users/remove'; id: string }
  | { type: 'members/upsert'; member: TenantMember }
  | { type: 'members/remove'; id: string }
  | ({ type: 'applications/upsert'; application: Application } & Meta)
  | { type: 'applications/remove'; id: string }
  | ({ type: 'subscriptions/upsert'; subscription: Subscription } & Meta)
  | ({
      type: 'subscriptions/setStatus'
      id: string
      status: SubscriptionStatus
      note?: string
    } & Meta)
  | ({ type: 'subscriptions/cancel'; id: string } & Meta)
  | ({ type: 'subscriptions/reactivate'; id: string } & Meta)
  | ({ type: 'subscriptions/changePeriod'; id: string; billingPeriod: BillingPeriod } & Meta)
  | { type: 'subscriptions/remove'; id: string }
  | ({ type: 'apiClients/create'; client: ApiClient } & Meta)
  | ({ type: 'apiClients/rotate'; id: string; secretHint: string } & Meta)
  | ({ type: 'apiClients/revoke'; id: string } & Meta)
  | { type: 'apiClients/remove'; id: string }
  | { type: 'invoices/upsert'; invoice: Invoice }
  | ({ type: 'invoices/generate'; subscriptionId: string } & Meta)
  | ({ type: 'payments/create'; invoiceId: string; channel: PaymentChannel } & Meta)
  | ({ type: 'payments/simulate'; invoiceId: string; channel?: PaymentChannel } & Meta)
  | ({ type: 'payments/setStatus'; id: string; status: PaymentStatus } & Meta)
  | ({ type: 'webhooks/upsert'; endpoint: WebhookEndpoint } & Meta)
  | { type: 'webhooks/remove'; id: string }
  | ({ type: 'webhooks/retry'; deliveryId: string } & Meta)
  | ({ type: 'webhooks/test'; endpointId: string } & Meta)
  | ({ type: 'sessions/create'; session: Session } & Meta)
  | ({ type: 'sessions/revoke'; id: string } & Meta)
  | { type: 'audit/append'; entry: Omit<AuditLog, 'id'> }
  | { type: 'store/replace'; state: AppState }
  | { type: 'invitations/accept'; token: string; at?: string }
  | { type: 'store/tick'; at?: string }
  | ({ type: 'subscriptions/cancelChange'; id: string } & Meta)

const nowIso = () => new Date().toISOString()

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx === -1) return [item, ...list]
  const next = list.slice()
  next[idx] = item
  return next
}

function auditEntry(
  meta: Meta,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  tenantId: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditLog {
  return {
    id: newId('aud'),
    actorId: meta.actor.id,
    actorName: meta.actor.name,
    tenantId,
    action,
    resourceType,
    resourceId,
    before,
    after,
    requestId: requestId(),
    sourceIp: null,
    at: meta.at ?? nowIso(),
  }
}

function withAudit(state: AppState, entry: AuditLog): AppState {
  return { ...state, auditLogs: [entry, ...state.auditLogs] }
}

/** Fan an event out to every active endpoint that subscribed to it. Endpoints on
 *  `crm.example.com` fail on purpose so the demo has a visible retry case. */
function emitWebhook(
  state: AppState,
  event: EventType,
  applicationId: string | null,
  data: Record<string, unknown>,
  at: string,
): AppState {
  const targets = state.webhooks.filter(
    (w) =>
      w.status === 'active' &&
      w.events.includes(event) &&
      (!applicationId || w.applicationId === applicationId),
  )
  if (targets.length === 0) return state
  const deliveries = targets.map<WebhookDelivery>((w) => {
    const failing = w.url.includes('crm.example.com')
    return {
      id: newId('dlv'),
      endpointId: w.id,
      event,
      status: failing ? 'retrying' : 'success',
      httpStatus: failing ? 500 : 200,
      latencyMs: failing ? 1400 : 90 + Math.floor(Math.random() * 120),
      attempt: 1,
      maxAttempts: 5,
      at,
      payload: JSON.stringify(
        { id: `evt_${newId('').slice(1)}`, type: event, created_at: at, data },
        null,
        2,
      ),
      response: failing ? '{"error":"Internal Server Error"}' : '{"ok":true}',
    }
  })
  return { ...state, deliveries: [...deliveries, ...state.deliveries] }
}

function pushSubscriptionEvent(
  state: AppState,
  subscriptionId: string,
  type: EventType,
  label: string,
  note: string | null,
  at: string,
): AppState {
  const ev: SubscriptionEvent = { id: newId('sev'), subscriptionId, at, type, label, note }
  return { ...state, subscriptionEvents: [ev, ...state.subscriptionEvents] }
}

const STATUS_EVENT: Partial<Record<SubscriptionStatus, EventType>> = {
  active: 'subscription.activated',
  past_due: 'subscription.past_due',
  grace_period: 'subscription.grace_started',
  suspended: 'subscription.suspended',
  cancelled: 'subscription.cancelled',
  expired: 'subscription.expired',
  trial: 'subscription.activated',
}

function transitionSubscription(
  state: AppState,
  id: string,
  status: SubscriptionStatus,
  meta: Meta,
  note: string | null,
  auditAction: AuditAction,
): AppState {
  const sub = state.subscriptions.find((s) => s.id === id)
  if (!sub || sub.status === status) return state
  const at = meta.at ?? nowIso()
  const gracePeriodEnd =
    status === 'grace_period'
      ? (sub.gracePeriodEnd ?? new Date(new Date(at).getTime() + 7 * 86_400_000).toISOString())
      : status === 'active'
        ? null
        : sub.gracePeriodEnd
  const next: Subscription = {
    ...sub,
    status,
    gracePeriodEnd,
    updatedAt: at,
    cancelAtPeriodEnd:
      status === 'cancelled' ? true : status === 'active' ? false : sub.cancelAtPeriodEnd,
  }
  let s: AppState = { ...state, subscriptions: upsert(state.subscriptions, next) }
  const eventType = STATUS_EVENT[status] ?? 'subscription.updated'
  s = pushSubscriptionEvent(
    s,
    id,
    eventType,
    `Subscription ${SUBSCRIPTION_STATUS_LABEL[status].toLowerCase()}`,
    note,
    at,
  )
  s = withAudit(
    s,
    auditEntry(
      { ...meta, at },
      auditAction,
      'subscription',
      id,
      sub.tenantId,
      { status: sub.status },
      { status },
    ),
  )
  const payload = {
    tenant_id: sub.tenantId,
    subscription_id: id,
    application_id: sub.applicationId,
    billing_period: sub.billingPeriod,
    status,
  }
  s = emitWebhook(s, eventType, sub.applicationId, payload, at)
  if (eventType !== 'subscription.updated')
    s = emitWebhook(s, 'subscription.updated', sub.applicationId, payload, at)
  return s
}

function expirePayment(payment: Payment, at: string, note: string | null): Payment {
  return {
    ...payment,
    status: 'expired',
    events: [...payment.events, { at, type: 'expired', note }],
  }
}

/** A successful provider callback: mark the payment paid, settle the invoice, reactivate the subscription. */
function settlePayment(state: AppState, payment: Payment, meta: Meta, at: string): AppState {
  const paid: Payment = {
    ...payment,
    status: 'success',
    paidAt: at,
    events: [
      ...payment.events,
      { at, type: 'callback', note: 'status PAID' },
      {
        at,
        type: 'paid',
        note: `${PAYMENT_CHANNEL_BY_ID[payment.channel].label} · ${payment.providerReference}`,
      },
    ],
  }
  const invoice = payment.invoiceId
    ? state.invoices.find((i) => i.id === payment.invoiceId)
    : undefined
  let s: AppState = {
    ...state,
    payments: upsert(state.payments, paid),
    invoices: invoice
      ? upsert(state.invoices, { ...invoice, status: 'paid', paidAt: at })
      : state.invoices,
  }
  s = withAudit(
    s,
    auditEntry(
      { ...meta, at },
      'payment.status_changed',
      'payment',
      payment.id,
      payment.tenantId,
      { status: payment.status },
      { status: 'success', invoice: invoice?.number ?? null },
    ),
  )
  const sub = s.subscriptions.find((x) => x.id === payment.subscriptionId)
  s = emitWebhook(
    s,
    'payment.success',
    sub?.applicationId ?? null,
    {
      tenant_id: payment.tenantId,
      payment_id: payment.id,
      invoice: invoice?.number ?? null,
      amount: payment.amount,
    },
    at,
  )
  if (!sub) return s
  if (invoice && invoice.periodStart >= sub.currentPeriodEnd && invoice.periodStart <= at) {
    s = {
      ...s,
      subscriptions: upsert(s.subscriptions, {
        ...sub,
        currentPeriodStart: invoice.periodStart,
        currentPeriodEnd: invoice.periodEnd,
        updatedAt: at,
      }),
    }
  }
  s = pushSubscriptionEvent(
    s,
    sub.id,
    'payment.success',
    'Payment received',
    `${invoice?.number ?? payment.externalId} paid via ${PAYMENT_CHANNEL_BY_ID[payment.channel].label}`,
    at,
  )
  if (sub.status !== 'active')
    s = transitionSubscription(
      s,
      sub.id,
      'active',
      { ...meta, at },
      'Reactivated after payment',
      'subscription.reactivated',
    )
  return s
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'store/tick': {
      const at = action.at ?? nowIso()
      let next = state
      for (const sub of state.subscriptions) {
        const change = sub.scheduledChange
        if (!change || change.effectiveAt > at || sub.cancelAtPeriodEnd) continue
        next = {
          ...next,
          subscriptions: upsert(next.subscriptions, {
            ...sub,
            billingPeriod: change.billingPeriod,
            price: change.price,
            scheduledChange: null,
            updatedAt: at,
          }),
        }
        next = pushSubscriptionEvent(
          next,
          sub.id,
          'subscription.updated',
          'Scheduled billing change applied',
          `${BILLING_PERIOD_LABEL[change.billingPeriod]} billing`,
          at,
        )
      }
      return next
    }
    case 'subscriptions/cancelChange': {
      const sub = state.subscriptions.find((s) => s.id === action.id)
      if (
        !sub?.scheduledChange ||
        state.invoices.some(
          (i) =>
            i.subscriptionId === sub.id &&
            i.status !== 'void' &&
            i.periodStart >= sub.currentPeriodEnd,
        )
      )
        return state
      return {
        ...state,
        subscriptions: upsert(state.subscriptions, {
          ...sub,
          scheduledChange: null,
          updatedAt: action.at ?? nowIso(),
        }),
      }
    }
    case 'invitations/accept': {
      const at = action.at ?? nowIso()
      const member = state.members.find((m) => m.invitationToken === action.token)
      if (
        !member ||
        member.status !== 'invited' ||
        !member.invitationExpiresAt ||
        member.invitationExpiresAt <= at
      )
        return state
      const user = state.users.find((u) => u.id === member.userId)
      if (!user || user.status === 'disabled') return state
      return {
        ...state,
        members: upsert(state.members, { ...member, status: 'active', invitationAcceptedAt: at }),
        users: upsert(state.users, { ...user, status: 'active', updatedAt: at }),
      }
    }
    case 'store/replace':
      return action.state

    case 'tenants/upsert': {
      const existing = state.tenants.find((t) => t.id === action.tenant.id)
      const s = { ...state, tenants: upsert(state.tenants, action.tenant) }
      return withAudit(
        s,
        auditEntry(
          action,
          existing ? 'tenant.updated' : 'tenant.created',
          'tenant',
          action.tenant.id,
          action.tenant.id,
          existing ? { name: existing.name, status: existing.status } : null,
          { name: action.tenant.name, status: action.tenant.status },
        ),
      )
    }
    case 'tenants/remove': {
      const subIds = new Set(
        state.subscriptions.filter((s) => s.tenantId === action.id).map((s) => s.id),
      )
      return {
        ...state,
        tenants: state.tenants.filter((t) => t.id !== action.id),
        members: state.members.filter((m) => m.tenantId !== action.id),
        subscriptions: state.subscriptions.filter((s) => s.tenantId !== action.id),
        subscriptionEvents: state.subscriptionEvents.filter((e) => !subIds.has(e.subscriptionId)),
        invoices: state.invoices.filter((i) => i.tenantId !== action.id),
        payments: state.payments.filter((p) => p.tenantId !== action.id),
        sessions: state.sessions.filter((s) => s.tenantId !== action.id),
      }
    }
    case 'tenants/setStatus': {
      const tenant = state.tenants.find((t) => t.id === action.id)
      if (!tenant || tenant.status === action.status) return state
      const at = action.at ?? nowIso()
      let s: AppState = {
        ...state,
        tenants: upsert(state.tenants, { ...tenant, status: action.status, updatedAt: at }),
      }
      const auditAction: AuditAction =
        action.status === 'suspended'
          ? 'tenant.suspended'
          : action.status === 'active' && tenant.status === 'suspended'
            ? 'tenant.reactivated'
            : 'tenant.updated'
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          auditAction,
          'tenant',
          tenant.id,
          tenant.id,
          { status: tenant.status },
          { status: action.status },
        ),
      )
      const event: EventType | null =
        action.status === 'suspended'
          ? 'tenant.suspended'
          : auditAction === 'tenant.reactivated'
            ? 'tenant.reactivated'
            : null
      return event
        ? emitWebhook(s, event, null, { tenant_id: tenant.id, status: action.status }, at)
        : s
    }

    case 'users/upsert':
      return { ...state, users: upsert(state.users, action.user) }
    case 'users/remove':
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.id),
        members: state.members.filter((m) => m.userId !== action.id),
        sessions: state.sessions.filter((s) => s.userId !== action.id),
      }

    case 'members/upsert':
      return { ...state, members: upsert(state.members, action.member) }
    case 'members/remove':
      return { ...state, members: state.members.filter((m) => m.id !== action.id) }

    case 'applications/upsert': {
      const existing = state.applications.find((a) => a.id === action.application.id)
      const s = { ...state, applications: upsert(state.applications, action.application) }
      const at = action.at ?? nowIso()
      return emitWebhook(
        s,
        existing ? 'application.updated' : 'application.created',
        null,
        { application_id: action.application.id, code: action.application.code },
        at,
      )
    }
    case 'applications/remove': {
      const endpointIds = new Set(
        state.webhooks.filter((w) => w.applicationId === action.id).map((w) => w.id),
      )
      return {
        ...state,
        applications: state.applications.filter((a) => a.id !== action.id),
        apiClients: state.apiClients.filter((c) => c.applicationId !== action.id),
        webhooks: state.webhooks.filter((w) => w.applicationId !== action.id),
        deliveries: state.deliveries.filter((d) => !endpointIds.has(d.endpointId)),
        subscriptions: state.subscriptions.filter((s) => s.applicationId !== action.id),
        members: state.members.map((m) => ({
          ...m,
          applicationIds: m.applicationIds.filter((id) => id !== action.id),
        })),
      }
    }

    case 'subscriptions/upsert': {
      const existing = state.subscriptions.find((s) => s.id === action.subscription.id)
      const at = action.at ?? nowIso()
      let s: AppState = {
        ...state,
        subscriptions: upsert(state.subscriptions, action.subscription),
      }
      if (!existing) {
        s = pushSubscriptionEvent(
          s,
          action.subscription.id,
          'subscription.created',
          'Subscription created',
          null,
          at,
        )
        if (action.subscription.status !== 'draft')
          s = pushSubscriptionEvent(
            s,
            action.subscription.id,
            'subscription.activated',
            action.subscription.status === 'trial' ? 'Trial started' : 'Subscription started',
            null,
            at,
          )
        s = emitWebhook(
          s,
          'subscription.created',
          action.subscription.applicationId,
          {
            tenant_id: action.subscription.tenantId,
            subscription_id: action.subscription.id,
            billing_period: action.subscription.billingPeriod,
          },
          at,
        )
      }
      return withAudit(
        s,
        auditEntry(
          { ...action, at },
          'subscription.changed',
          'subscription',
          action.subscription.id,
          action.subscription.tenantId,
          existing ? { status: existing.status, billingPeriod: existing.billingPeriod } : null,
          { status: action.subscription.status, billingPeriod: action.subscription.billingPeriod },
        ),
      )
    }
    case 'subscriptions/setStatus':
      return transitionSubscription(
        state,
        action.id,
        action.status,
        action,
        action.note ?? null,
        action.status === 'active' ? 'manual.reactivation' : 'subscription.changed',
      )
    case 'subscriptions/cancel':
      return transitionSubscription(
        state,
        action.id,
        'cancelled',
        action,
        'Access continues until period end',
        'subscription.cancelled',
      )
    case 'subscriptions/reactivate':
      return transitionSubscription(
        state,
        action.id,
        'active',
        action,
        'Reactivated manually',
        'subscription.reactivated',
      )
    case 'subscriptions/changePeriod': {
      const sub = state.subscriptions.find((s) => s.id === action.id)
      const app = sub ? state.applications.find((a) => a.id === sub.applicationId) : undefined
      if (
        !sub ||
        !app ||
        sub.billingPeriod === action.billingPeriod ||
        sub.cancelAtPeriodEnd ||
        (action.billingPeriod === 'annual' ? app.priceAnnual : app.priceMonthly) <= 0
      )
        return state
      if (
        state.invoices.some(
          (i) =>
            i.subscriptionId === sub.id &&
            i.status !== 'void' &&
            i.periodStart >= sub.currentPeriodEnd,
        )
      )
        return state
      const at = action.at ?? nowIso()
      const price = action.billingPeriod === 'annual' ? app.priceAnnual : app.priceMonthly
      let s: AppState = {
        ...state,
        subscriptions: upsert(state.subscriptions, {
          ...sub,
          scheduledChange: {
            billingPeriod: action.billingPeriod,
            price,
            effectiveAt: sub.currentPeriodEnd,
          },
          updatedAt: at,
        }),
      }
      s = pushSubscriptionEvent(
        s,
        sub.id,
        'subscription.updated',
        `Billing change scheduled for ${sub.currentPeriodEnd}: ${BILLING_PERIOD_LABEL[action.billingPeriod].toLowerCase()}`,
        null,
        at,
      )
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'subscription.period_changed',
          'subscription',
          sub.id,
          sub.tenantId,
          { billingPeriod: sub.billingPeriod, price: sub.price },
          { billingPeriod: action.billingPeriod, price },
        ),
      )
      return emitWebhook(
        s,
        'subscription.updated',
        sub.applicationId,
        { tenant_id: sub.tenantId, subscription_id: sub.id, billing_period: action.billingPeriod },
        at,
      )
    }
    case 'subscriptions/remove':
      return {
        ...state,
        subscriptions: state.subscriptions.filter((s) => s.id !== action.id),
        subscriptionEvents: state.subscriptionEvents.filter((e) => e.subscriptionId !== action.id),
        invoices: state.invoices.filter((i) => i.subscriptionId !== action.id),
        payments: state.payments.filter((p) => p.subscriptionId !== action.id),
      }

    case 'apiClients/create': {
      const at = action.at ?? nowIso()
      let s: AppState = { ...state, apiClients: upsert(state.apiClients, action.client) }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'api_client.created',
          'api_client',
          action.client.id,
          null,
          null,
          { clientId: action.client.clientId, environment: action.client.environment },
        ),
      )
      return emitWebhook(
        s,
        'api_client.created',
        null,
        { client_id: action.client.clientId, application_id: action.client.applicationId },
        at,
      )
    }
    case 'apiClients/rotate': {
      const client = state.apiClients.find((c) => c.id === action.id)
      if (!client) return state
      const at = action.at ?? nowIso()
      let s: AppState = {
        ...state,
        apiClients: upsert(state.apiClients, {
          ...client,
          secretHint: action.secretHint,
          rotatedAt: at,
        }),
      }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'api_client.rotated',
          'api_client',
          client.id,
          null,
          { secretHint: client.secretHint },
          { secretHint: action.secretHint },
        ),
      )
      return emitWebhook(s, 'api_client.rotated', null, { client_id: client.clientId }, at)
    }
    case 'apiClients/revoke': {
      const client = state.apiClients.find((c) => c.id === action.id)
      if (!client || client.status === 'revoked') return state
      const at = action.at ?? nowIso()
      let s: AppState = {
        ...state,
        apiClients: upsert(state.apiClients, { ...client, status: 'revoked' }),
      }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'api_client.revoked',
          'api_client',
          client.id,
          null,
          { status: 'active' },
          { status: 'revoked' },
        ),
      )
      return emitWebhook(s, 'api_client.revoked', null, { client_id: client.clientId }, at)
    }
    case 'apiClients/remove':
      return { ...state, apiClients: state.apiClients.filter((c) => c.id !== action.id) }

    case 'invoices/upsert':
      return { ...state, invoices: upsert(state.invoices, action.invoice) }
    case 'invoices/generate': {
      const sub = state.subscriptions.find((s) => s.id === action.subscriptionId)
      const app = sub ? state.applications.find((a) => a.id === sub.applicationId) : undefined
      if (!sub || !app) return state
      const at = action.at ?? nowIso()
      const renewal = sub.scheduledChange
        ? {
            ...sub,
            billingPeriod: sub.scheduledChange.billingPeriod,
            price: sub.scheduledChange.price,
          }
        : sub
      const invoice = buildInvoice(renewal, app, {
        id: newId('inv'),
        number: nextInvoiceNumber(state.invoices, new Date(at).getTime()),
        periodStart: sub.currentPeriodEnd,
        issuedAt: at,
      })
      let s: AppState = { ...state, invoices: [invoice, ...state.invoices] }
      s = pushSubscriptionEvent(
        s,
        sub.id,
        'subscription.renewed',
        'Renewal invoice created',
        invoice.number,
        at,
      )
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'invoice.generated',
          'invoice',
          invoice.id,
          sub.tenantId,
          null,
          { number: invoice.number, total: invoice.total },
        ),
      )
      return emitWebhook(
        s,
        'subscription.renewed',
        sub.applicationId,
        {
          tenant_id: sub.tenantId,
          subscription_id: sub.id,
          invoice: invoice.number,
          total: invoice.total,
        },
        at,
      )
    }

    case 'payments/create': {
      const invoice = state.invoices.find((i) => i.id === action.invoiceId)
      if (!invoice || invoice.status === 'paid' || invoice.status === 'void') return state
      const at = action.at ?? nowIso()
      const payment = buildPaymentRequest(invoice, action.channel, newId('pay'), at)
      let s: AppState = {
        ...state,
        payments: [
          payment,
          ...state.payments.map((p) =>
            p.invoiceId === invoice.id && p.status === 'pending'
              ? expirePayment(p, at, 'Replaced by a new payment request')
              : p,
          ),
        ],
      }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'payment.status_changed',
          'payment',
          payment.id,
          invoice.tenantId,
          null,
          { status: 'pending', channel: action.channel, invoice: invoice.number },
        ),
      )
      const sub = s.subscriptions.find((x) => x.id === invoice.subscriptionId)
      s = emitWebhook(
        s,
        'payment.created',
        sub?.applicationId ?? null,
        {
          tenant_id: invoice.tenantId,
          invoice: invoice.number,
          amount: invoice.total,
          channel: action.channel,
        },
        at,
      )
      return emitWebhook(
        s,
        'payment.pending',
        sub?.applicationId ?? null,
        { tenant_id: invoice.tenantId, payment_id: payment.id },
        at,
      )
    }
    case 'payments/simulate': {
      const invoice = state.invoices.find((i) => i.id === action.invoiceId)
      if (!invoice || invoice.status === 'paid') return state
      const at = action.at ?? nowIso()
      const created = reducer(state, {
        type: 'payments/create',
        invoiceId: invoice.id,
        channel: action.channel ?? 'BCA',
        actor: action.actor,
        at,
      })
      const payment = created.payments.find(
        (p) => p.invoiceId === invoice.id && p.status === 'pending',
      )
      if (!payment) return created
      return settlePayment(created, payment, action, at)
    }
    case 'payments/setStatus': {
      const payment = state.payments.find((p) => p.id === action.id)
      if (!payment || payment.status === action.status) return state
      const at = action.at ?? nowIso()
      if (action.status === 'success') return settlePayment(state, payment, action, at)
      if (action.status === 'expired') {
        const s = { ...state, payments: upsert(state.payments, expirePayment(payment, at, null)) }
        return withAudit(
          s,
          auditEntry(
            { ...action, at },
            'payment.status_changed',
            'payment',
            payment.id,
            payment.tenantId,
            { status: payment.status },
            { status: 'expired' },
          ),
        )
      }
      const eventType =
        action.status === 'failed'
          ? 'failed'
          : action.status === 'refunded'
            ? 'refunded'
            : 'pending'
      let s: AppState = {
        ...state,
        payments: upsert(state.payments, {
          ...payment,
          status: action.status,
          events: [
            ...payment.events,
            { at, type: 'callback', note: `status ${action.status.toUpperCase()}` },
            { at, type: eventType, note: null },
          ],
        }),
      }
      if (action.status === 'refunded' && payment.invoiceId) {
        const inv = s.invoices.find((i) => i.id === payment.invoiceId)
        if (inv) s = { ...s, invoices: upsert(s.invoices, { ...inv, status: 'void' }) }
      }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'payment.status_changed',
          'payment',
          payment.id,
          payment.tenantId,
          { status: payment.status },
          { status: action.status },
        ),
      )
      const event: EventType =
        action.status === 'failed'
          ? 'payment.failed'
          : action.status === 'refunded'
            ? 'payment.refunded'
            : 'payment.pending'
      return emitWebhook(
        s,
        event,
        null,
        { tenant_id: payment.tenantId, payment_id: payment.id },
        at,
      )
    }

    case 'webhooks/upsert': {
      const existing = state.webhooks.find((w) => w.id === action.endpoint.id)
      const s = { ...state, webhooks: upsert(state.webhooks, action.endpoint) }
      return existing
        ? s
        : withAudit(
            s,
            auditEntry(action, 'webhook.created', 'webhook', action.endpoint.id, null, null, {
              url: action.endpoint.url,
            }),
          )
    }
    case 'webhooks/remove':
      return {
        ...state,
        webhooks: state.webhooks.filter((w) => w.id !== action.id),
        deliveries: state.deliveries.filter((d) => d.endpointId !== action.id),
      }
    case 'webhooks/retry': {
      const delivery = state.deliveries.find((d) => d.id === action.deliveryId)
      if (!delivery) return state
      const at = action.at ?? nowIso()
      const next: WebhookDelivery = {
        ...delivery,
        status: 'success',
        httpStatus: 200,
        latencyMs: 130,
        attempt: delivery.attempt + 1,
        at,
        response: '{"ok":true}',
      }
      const s = { ...state, deliveries: upsert(state.deliveries, next) }
      return withAudit(
        s,
        auditEntry(
          { ...action, at },
          'webhook.retried',
          'webhook_delivery',
          delivery.id,
          null,
          { status: delivery.status, attempt: delivery.attempt },
          { status: 'success', attempt: next.attempt },
        ),
      )
    }
    case 'webhooks/test': {
      const endpoint = state.webhooks.find((w) => w.id === action.endpointId)
      if (!endpoint) return state
      const at = action.at ?? nowIso()
      const failing = endpoint.url.includes('crm.example.com')
      const delivery: WebhookDelivery = {
        id: newId('dlv'),
        endpointId: endpoint.id,
        event: 'subscription.updated',
        status: failing ? 'failed' : 'success',
        httpStatus: failing ? 500 : 200,
        latencyMs: failing ? 2100 : 110,
        attempt: 1,
        maxAttempts: 1,
        at,
        payload: JSON.stringify(
          { id: 'evt_test', type: 'subscription.updated', created_at: at, data: { test: true } },
          null,
          2,
        ),
        response: failing ? '{"error":"Internal Server Error"}' : '{"ok":true}',
      }
      return { ...state, deliveries: [delivery, ...state.deliveries] }
    }

    case 'sessions/create': {
      const s = { ...state, sessions: upsert(state.sessions, action.session) }
      return withAudit(
        s,
        auditEntry(
          action,
          'user.login',
          'session',
          action.session.id,
          action.session.tenantId,
          null,
          { method: 'password' },
        ),
      )
    }
    case 'sessions/revoke': {
      const session = state.sessions.find((x) => x.id === action.id)
      if (!session || session.revoked) return state
      const at = action.at ?? nowIso()
      let s: AppState = {
        ...state,
        sessions: upsert(state.sessions, { ...session, revoked: true }),
      }
      s = withAudit(
        s,
        auditEntry(
          { ...action, at },
          'session.revoked',
          'session',
          session.id,
          session.tenantId,
          { revoked: false },
          { revoked: true },
        ),
      )
      return emitWebhook(
        s,
        'session.revoked',
        null,
        { session_id: session.id, user_id: session.userId },
        at,
      )
    }

    case 'audit/append':
      return { ...state, auditLogs: [{ id: newId('aud'), ...action.entry }, ...state.auditLogs] }
  }
}
