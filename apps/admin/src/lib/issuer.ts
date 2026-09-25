import type { PlatformSettings } from '@scp/types'
import type { InvoiceParty } from '@scp/ui'

/** The issuer block printed on invoices and receipts. Empty fields are left out. */
export function issuerParty(platform: PlatformSettings): InvoiceParty {
  const taxId = platform.taxId.trim()
  return {
    name: platform.brandName,
    lines: [
      platform.legalName,
      ...platform.addressLines,
      platform.billingEmail,
      taxId ? `NPWP ${taxId}` : '',
    ].filter((line) => line.trim() !== ''),
  }
}
