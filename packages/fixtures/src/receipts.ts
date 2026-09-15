import type { Payment } from '@scp/types'

/** Receipt number derived from the payment so it stays stable without extra state. */
export function receiptNumber(payment: Pick<Payment, 'id' | 'paidAt' | 'createdAt'>): string {
  const year = new Date(payment.paidAt ?? payment.createdAt).getFullYear()
  const tail = payment.id
    .replace(/^pay-/, '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase()
  return `RCP-${year}-${tail}`
}
