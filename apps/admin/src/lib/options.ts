import { fmtIdr } from '@scp/fixtures'
import type { Application, Invoice, Subscription, Tenant, User } from '@scp/types'
import {
  BILLING_PERIOD_LABEL,
  PAYMENT_CHANNELS,
  PAYMENT_METHOD_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import type { ComboboxOption } from '@scp/ui'

export function labelOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): ComboboxOption[] {
  return values.map((value) => ({ value, label: labels[value] }))
}

/** Prepends the explicit "all" choice used by list filters. */
export function withAll(label: string, options: ComboboxOption[]): ComboboxOption[] {
  return [{ value: 'all', label }, ...options]
}

export function tenantOptions(tenants: Tenant[]): ComboboxOption[] {
  return tenants.map((t) => ({ value: t.id, label: t.name, hint: `${t.code} · ${t.billingEmail}` }))
}

export function applicationOptions(applications: Application[]): ComboboxOption[] {
  return applications.map((a) => ({ value: a.id, label: a.name, hint: a.code }))
}

export function userOptions(users: User[]): ComboboxOption[] {
  return users.map((u) => ({ value: u.id, label: u.name, hint: u.email }))
}

export function allOption(label: string): ComboboxOption {
  return { value: 'all', label }
}

export function subscriptionOptions(
  subscriptions: Subscription[],
  applicationsById: Map<string, Application>,
): ComboboxOption[] {
  return subscriptions.map((s) => ({
    value: s.id,
    label: applicationsById.get(s.applicationId)?.name ?? s.applicationId,
    hint: `${BILLING_PERIOD_LABEL[s.billingPeriod]} · ${fmtIdr(s.price, s.currency)} · ${SUBSCRIPTION_STATUS_LABEL[s.status]}`,
  }))
}

export function invoiceOptions(
  invoices: Invoice[],
  tenantsById: Map<string, Tenant>,
): ComboboxOption[] {
  return invoices.map((i) => ({
    value: i.id,
    label: `${tenantsById.get(i.tenantId)?.name ?? i.tenantId} · ${i.number}`,
    hint: fmtIdr(i.total, i.currency),
  }))
}

/** Xendit channels grouped by payment method. The single source is PAYMENT_CHANNELS. */
export const CHANNEL_OPTIONS: ComboboxOption[] = PAYMENT_CHANNELS.map((c) => ({
  value: c.channel,
  label: c.label,
  group: PAYMENT_METHOD_LABEL[c.method],
}))
