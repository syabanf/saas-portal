import type {
  AccessLog,
  ApiClient,
  Application,
  AuditLog,
  Invoice,
  Payment,
  Session,
  Subscription,
  SubscriptionEvent,
  Tenant,
  TenantMember,
  User,
  WebhookDelivery,
  WebhookEndpoint,
} from '@scp/types'
import accessLogs from '../data/access-logs.json'
import apiClients from '../data/api-clients.json'
import applications from '../data/applications.json'
import auditLogs from '../data/audit-logs.json'
import deliveries from '../data/deliveries.json'
import invoices from '../data/invoices.json'
import members from '../data/members.json'
import meta from '../data/meta.json'
import payments from '../data/payments.json'
import sessions from '../data/sessions.json'
import subscriptionEvents from '../data/subscription-events.json'
import subscriptions from '../data/subscriptions.json'
import tenants from '../data/tenants.json'
import users from '../data/users.json'
import webhooks from '../data/webhooks.json'
import type { AppState } from './store'

export const FIXTURE_NOW: string = meta.now

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

/** Shift every ISO timestamp so "now" in the seed lines up with the real clock. */
function rebase<T>(value: T, deltaMs: number): T {
  return JSON.parse(JSON.stringify(value), (_key, v) =>
    typeof v === 'string' && ISO_RE.test(v)
      ? new Date(new Date(v).getTime() + deltaMs).toISOString()
      : v,
  ) as T
}

/** Fresh copy of the seeded state with relative time anchored to now. Every collection is cast once here, never in the UI. */
export function loadFixtures(now: number = Date.now()): AppState {
  const delta = now - new Date(FIXTURE_NOW).getTime()
  return rebase(
    {
      tenants: tenants as Tenant[],
      users: users as User[],
      members: members as TenantMember[],
      applications: applications as Application[],
      subscriptions: subscriptions as Subscription[],
      subscriptionEvents: subscriptionEvents as SubscriptionEvent[],
      apiClients: apiClients as ApiClient[],
      webhooks: webhooks as WebhookEndpoint[],
      deliveries: deliveries as WebhookDelivery[],
      invoices: invoices as Invoice[],
      payments: payments as Payment[],
      accessLogs: accessLogs as AccessLog[],
      auditLogs: auditLogs as AuditLog[],
      sessions: sessions as Session[],
    },
    delta,
  )
}

export * from './store'
export * from './access'
export * from './kpi'
export * from './format'
export * from './ids'
export * from './sdk-snippets'
export * from './payments'
export * from './invoices'
export * from './receipts'
export * from './invitations'
