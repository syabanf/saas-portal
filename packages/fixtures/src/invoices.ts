import type { Application, Invoice, Subscription } from '@scp/types'
import { BILLING_PERIOD_LABEL } from '@scp/types'

export const DEFAULT_TAX_RATE = 0.11
export const INVOICE_DUE_DAYS = 14
const DAY = 86_400_000

export function invoiceSubtotal(invoice: Pick<Invoice, 'lines'>): number {
  return invoice.lines.reduce((sum, l) => sum + l.amount, 0)
}

export function invoiceTax(invoice: Pick<Invoice, 'lines' | 'taxRate'>): number {
  return Math.round(invoiceSubtotal(invoice) * invoice.taxRate)
}

/** Next sequential number: INV-<year>-<n>, continuing from the highest existing one. */
export function nextInvoiceNumber(
  existing: Pick<Invoice, 'number'>[],
  now: number = Date.now(),
): string {
  const year = new Date(now).getFullYear()
  const max = existing.reduce((m, i) => {
    const match = /^INV-(\d{4})-(\d+)$/.exec(i.number)
    return match && Number(match[1]) === year ? Math.max(m, Number(match[2])) : m
  }, 1000)
  return `INV-${year}-${max + 1}`
}

export function periodDays(billingPeriod: Subscription['billingPeriod']): number {
  return billingPeriod === 'annual' ? 365 : 30
}

/** An invoice for one billing period of a subscription, issued at `issuedAt`. */
export function buildInvoice(
  subscription: Pick<Subscription, 'id' | 'tenantId' | 'billingPeriod' | 'price' | 'currency'>,
  app: Pick<Application, 'name'>,
  input: {
    id: string
    number: string
    periodStart: string
    issuedAt: string
    taxRate?: number
    status?: Invoice['status']
    paidAt?: string | null
  },
): Invoice {
  const periodEnd = new Date(
    new Date(input.periodStart).getTime() + periodDays(subscription.billingPeriod) * DAY,
  ).toISOString()
  const taxRate = input.taxRate ?? DEFAULT_TAX_RATE
  const lines = [
    {
      description: `${app.name} · ${BILLING_PERIOD_LABEL[subscription.billingPeriod]} subscription`,
      amount: subscription.price,
    },
  ]
  const subtotal = subscription.price
  return {
    id: input.id,
    billingPeriod: subscription.billingPeriod,
    tenantId: subscription.tenantId,
    subscriptionId: subscription.id,
    number: input.number,
    status: input.status ?? 'open',
    issuedAt: input.issuedAt,
    dueDate: new Date(new Date(input.issuedAt).getTime() + INVOICE_DUE_DAYS * DAY).toISOString(),
    paidAt: input.paidAt ?? null,
    periodStart: input.periodStart,
    periodEnd,
    taxRate,
    total: subtotal + Math.round(subtotal * taxRate),
    currency: subscription.currency,
    lines,
  }
}

/** The subscription's next period still has no invoice. */
export function needsRenewalInvoice(subscription: Subscription, invoices: Invoice[]): boolean {
  if (
    subscription.status === 'draft' ||
    subscription.status === 'cancelled' ||
    subscription.status === 'expired'
  )
    return false
  return !invoices.some(
    (i) =>
      i.subscriptionId === subscription.id &&
      i.status !== 'void' &&
      new Date(i.periodStart).getTime() >= new Date(subscription.currentPeriodEnd).getTime() - DAY,
  )
}
