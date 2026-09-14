import type { SubscriptionStatus } from '@scp/types'
import { monthlyValue } from './access'
import type { AppState } from './store'

export interface DashboardKpis {
  organizations: number
  activeSubscriptions: number
  trialSubscriptions: number
  mrr: number
  accessToday: number
  deniedToday: number
  paymentIssues: number
  pastDueAccounts: number
  failedWebhooks: number
  integrationsOffline: number
  integrationsWithIssues: number
  statusBreakdown: Record<SubscriptionStatus, number>
}

const DAY = 86_400_000

export function dashboardKpis(state: AppState, now: number = Date.now()): DashboardKpis {
  const since = now - DAY
  const breakdown = {
    draft: 0,
    trial: 0,
    active: 0,
    past_due: 0,
    grace_period: 0,
    suspended: 0,
    cancelled: 0,
    expired: 0,
  } satisfies Record<SubscriptionStatus, number>
  let mrr = 0
  for (const s of state.subscriptions) {
    breakdown[s.status] += 1
    if (s.status === 'active' || s.status === 'past_due' || s.status === 'grace_period')
      mrr += monthlyValue(s)
  }
  const todayLogs = state.accessLogs.filter((l) => new Date(l.at).getTime() >= since)
  return {
    organizations: state.tenants.length,
    activeSubscriptions: breakdown.active + breakdown.trial,
    trialSubscriptions: breakdown.trial,
    mrr,
    accessToday: todayLogs.length,
    deniedToday: todayLogs.filter((l) => l.decision === 'deny').length,
    paymentIssues: breakdown.past_due + breakdown.grace_period + breakdown.suspended,
    pastDueAccounts: breakdown.past_due + breakdown.grace_period,
    failedWebhooks: state.deliveries.filter((d) => d.status === 'failed' || d.status === 'retrying')
      .length,
    integrationsOffline: state.applications.filter((a) => a.health === 'offline').length,
    integrationsWithIssues: state.applications.filter((a) => a.health !== 'healthy').length,
    statusBreakdown: breakdown,
  }
}

/** Hourly access volume for the last 24 h, oldest first. */
export function accessSeries(
  state: AppState,
  now: number = Date.now(),
  buckets = 24,
): { allow: number; deny: number }[] {
  const out = Array.from({ length: buckets }, () => ({ allow: 0, deny: 0 }))
  const span = DAY / buckets
  for (const l of state.accessLogs) {
    const age = now - new Date(l.at).getTime()
    if (age < 0 || age >= DAY) continue
    const idx = buckets - 1 - Math.floor(age / span)
    const cell = out[idx]
    if (cell) cell[l.decision] += 1
  }
  return out
}
