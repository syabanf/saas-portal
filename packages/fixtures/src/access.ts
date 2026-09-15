import type {
  AppAccessState,
  Application,
  IntegrationMode,
  Subscription,
  SubscriptionStatus,
  TenantMember,
  Tenant,
} from '@scp/types'
import { SUBSCRIPTION_ACCESS_POLICY } from '@scp/types'

/** Default policy outcome for a status, resolving "allow until period end" against the clock. */
function subscriptionAccessOutcome(status: SubscriptionStatus, periodEnd: string, now: number) {
  const outcome = SUBSCRIPTION_ACCESS_POLICY[status]
  if (outcome === 'allow_until_end') return new Date(periodEnd).getTime() >= now ? 'allow' : 'deny'
  return outcome
}

export interface AppAccess {
  state: AppAccessState
  /** Date access ends for warning states (grace end or period end). */
  until: string | null
  subscription: Subscription | null
}

/**
 * What the launcher shows for one application (blueprint §43). Display only: the backend
 * enforces the real decision when the application is opened.
 */
export function appAccessFor(
  app: Application,
  subscription: Subscription | null,
  member: TenantMember | null,
  now: number = Date.now(),
  tenant?: Tenant | null,
): AppAccess {
  if (tenant?.status === 'suspended') return { state: 'suspended', until: null, subscription }
  const assigned = Boolean(
    member && member.status === 'active' && member.applicationIds.includes(app.id),
  )
  if (app.status !== 'active') return { state: 'disabled', until: null, subscription }
  if (app.accessPolicy !== 'subscription')
    return { state: assigned ? 'active' : 'not_assigned', until: null, subscription: null }
  if (!subscription || subscription.status === 'draft')
    return { state: 'not_subscribed', until: null, subscription }
  const outcome = subscriptionAccessOutcome(subscription.status, subscription.currentPeriodEnd, now)
  const allowedByApp = app.allowedStatuses.includes(subscription.status)
  if (outcome === 'deny' || !allowedByApp) {
    return {
      state: subscription.status === 'suspended' ? 'suspended' : 'expired',
      until: null,
      subscription,
    }
  }
  if (!assigned) return { state: 'not_assigned', until: null, subscription }
  if (outcome === 'allow_warning')
    return {
      state: 'payment_required',
      until: subscription.gracePeriodEnd ?? subscription.currentPeriodEnd,
      subscription,
    }
  if (subscription.status === 'trial')
    return { state: 'trial', until: subscription.currentPeriodEnd, subscription }
  return {
    state: 'active',
    until: subscription.cancelAtPeriodEnd ? subscription.currentPeriodEnd : null,
    subscription,
  }
}

export const APP_ACCESS_ORDER: Record<AppAccessState, number> = {
  active: 0,
  trial: 1,
  payment_required: 2,
  suspended: 3,
  expired: 4,
  not_subscribed: 5,
  not_assigned: 6,
  disabled: 7,
}

/** Monthly-normalised revenue of a subscription. */
export function monthlyValue(sub: Pick<Subscription, 'price' | 'billingPeriod'>): number {
  return sub.billingPeriod === 'annual' ? Math.round(sub.price / 12) : sub.price
}

export function priceFor(
  app: Pick<Application, 'priceMonthly' | 'priceAnnual'>,
  period: Subscription['billingPeriod'],
): number {
  return period === 'annual' ? app.priceAnnual : app.priceMonthly
}

/** Integration mode of a product, defaulting older records to the check flow. */
export function integrationModeOf(
  app: Pick<Application, 'integrationMode' | 'authMode'>,
): IntegrationMode {
  return app.integrationMode ?? (app.authMode === 'service_only' ? 'gateway' : 'verify')
}

/** The product API SaaS Gate protects, falling back to the application URL. */
export function apiUrlOf(app: Pick<Application, 'apiUrl' | 'baseUrl'>): string {
  return app.apiUrl || `${app.baseUrl.replace(/\/$/, '')}/api`
}

/** Origin a user is sent to when opening the product. */
export function openUrlOf(app: Pick<Application, 'baseUrl' | 'callbackUrl'>): string {
  if (app.baseUrl) return app.baseUrl
  try {
    return new URL(app.callbackUrl).origin
  } catch {
    return app.callbackUrl
  }
}

/** A product a person can open in a browser, as opposed to a machine-to-machine API. */
export function isUserFacing(
  app: Pick<Application, 'callbackUrl' | 'integrationMode' | 'authMode'>,
): boolean {
  return app.callbackUrl.trim() !== '' && integrationModeOf(app) !== 'gateway'
}
