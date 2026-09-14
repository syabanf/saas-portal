import type { Invoice, Payment, PaymentChannel, PaymentInstructions } from '@scp/types'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'

const BANK_PREFIX: Partial<Record<PaymentChannel, string>> = {
  BCA: '10766',
  BNI: '8808',
  BRI: '26215',
  MANDIRI: '88608',
  PERMATA: '8214',
}

function digits(seed: string, length: number): string {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  let out = ''
  while (out.length < length) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
    out += h.toString().slice(-6)
  }
  return out.slice(0, length)
}

/** Fee the provider charges for the channel, in IDR (illustrative Xendit pricing). */
export function paymentFee(channel: PaymentChannel, amount: number): number {
  const { method } = PAYMENT_CHANNEL_BY_ID[channel]
  switch (method) {
    case 'virtual_account':
      return 4_000
    case 'retail':
      return 5_000
    case 'qris':
      return Math.round(amount * 0.007)
    case 'ewallet':
      return Math.round(amount * 0.015)
    case 'card':
      return Math.round(amount * 0.029) + 2_000
  }
}

export function paymentInstructions(
  channel: PaymentChannel,
  reference: string,
): PaymentInstructions {
  const { method } = PAYMENT_CHANNEL_BY_ID[channel]
  const empty: PaymentInstructions = {
    accountNumber: null,
    qrString: null,
    paymentCode: null,
    checkoutUrl: null,
    cardLast4: null,
  }
  switch (method) {
    case 'virtual_account':
      return {
        ...empty,
        accountNumber: `${BANK_PREFIX[channel] ?? '9999'}${digits(reference, 11)}`,
      }
    case 'retail':
      return { ...empty, paymentCode: digits(reference, 12).replace(/(\d{4})(?=\d)/g, '$1 ') }
    case 'qris':
      return { ...empty, qrString: `00020101021226${digits(reference, 40)}5802ID` }
    case 'ewallet':
      return {
        ...empty,
        checkoutUrl: `https://checkout.xendit.co/${channel.toLowerCase()}/${reference}`,
      }
    case 'card':
      return { ...empty, cardLast4: digits(reference, 4) }
  }
}

/** A pending payment request for an invoice, shaped like a Xendit payment object. */
export function buildPaymentRequest(
  invoice: Invoice,
  channel: PaymentChannel,
  id: string,
  at: string,
): Payment {
  const option = PAYMENT_CHANNEL_BY_ID[channel]
  const providerReference = `xnd_${id.replace('pay-', '')}${digits(invoice.number + id, 8)}`
  return {
    id,
    tenantId: invoice.tenantId,
    subscriptionId: invoice.subscriptionId,
    invoiceId: invoice.id,
    provider: 'xendit',
    providerReference,
    externalId: invoice.number,
    method: option.method,
    channel,
    amount: invoice.total,
    fee: paymentFee(channel, invoice.total),
    currency: invoice.currency,
    status: 'pending',
    instructions: paymentInstructions(channel, providerReference),
    expiresAt:
      option.expiresInMinutes === null
        ? null
        : new Date(new Date(at).getTime() + option.expiresInMinutes * 60_000).toISOString(),
    paidAt: null,
    createdAt: at,
    events: [
      { at, type: 'created', note: `${option.label} · ${providerReference}` },
      {
        at,
        type: 'pending',
        note:
          option.expiresInMinutes === null
            ? null
            : `Expires in ${option.expiresInMinutes >= 60 ? `${option.expiresInMinutes / 60} hours` : `${option.expiresInMinutes} minutes`}`,
      },
    ],
  }
}
