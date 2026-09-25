import {
  buildInvoice,
  fmtDate,
  fmtIdr,
  invoiceSubtotal,
  invoiceTax,
  newId,
  nextInvoiceNumber,
  platformOf,
} from '@scp/fixtures'
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
} from '@scp/ui'
import * as React from 'react'
import { subscriptionOptions, tenantOptions } from '../../lib/options'
import { useScoped } from '../../state/app-state'

interface Draft {
  tenantId: string
  subscriptionId: string
  /** `YYYY-MM-DD` values straight from the date inputs. */
  periodStart: string
  issuedAt: string
  taxPercent: number
}

const dateInput = (iso: string) => iso.slice(0, 10)
const isoFromInput = (date: string) => new Date(`${date}T00:00:00`).toISOString()

function todayInput(): string {
  const now = new Date()
  return dateInput(new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString())
}

function emptyDraft(taxRate: number): Draft {
  return {
    tenantId: '',
    subscriptionId: '',
    periodStart: '',
    issuedAt: todayInput(),
    taxPercent: Math.round(taxRate * 100),
  }
}

export interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Creates one invoice for a billing period of a subscription; the amounts come from `buildInvoice`. */
export function InvoiceDialog({ open, onOpenChange }: InvoiceDialogProps) {
  const { state, tenants, invoices, subscriptionsByTenant, applicationsById, dispatch } =
    useScoped()
  const { taxRate } = platformOf(state)
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft(taxRate))
  React.useEffect(() => {
    if (open) setDraft(emptyDraft(taxRate))
  }, [open, taxRate])

  const tenantSubs = subscriptionsByTenant.get(draft.tenantId) ?? []
  const subscription = tenantSubs.find((s) => s.id === draft.subscriptionId)
  const app = subscription ? applicationsById.get(subscription.applicationId) : undefined
  const number = nextInvoiceNumber(invoices)
  const preview =
    subscription && app && draft.periodStart && draft.issuedAt
      ? buildInvoice(subscription, app, {
          id: '',
          number,
          periodStart: isoFromInput(draft.periodStart),
          issuedAt: isoFromInput(draft.issuedAt),
          taxRate: draft.taxPercent / 100,
        })
      : null

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function selectSubscription(subscriptionId: string) {
    const sub = tenantSubs.find((s) => s.id === subscriptionId)
    setDraft((d) => ({
      ...d,
      subscriptionId,
      periodStart: sub ? dateInput(sub.currentPeriodStart) : '',
    }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!preview) return
    dispatch({ type: 'invoices/upsert', invoice: { ...preview, id: newId('inv') } })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
            <DialogDescription>
              An invoice covers one billing period of a subscription. Paying it through a provider
              reactivates that subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Number" htmlFor="invoice-number">
              <Input id="invoice-number" value={number} readOnly disabled className="font-mono" />
            </FormField>
            <FormField
              label="Issue date"
              htmlFor="invoice-issued"
              hint="Due 14 days after this date."
            >
              <Input
                id="invoice-issued"
                type="date"
                value={draft.issuedAt}
                onChange={(e) => set('issuedAt', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Organization" htmlFor="invoice-tenant">
              <Combobox
                id="invoice-tenant"
                value={draft.tenantId}
                onChange={(tenantId) =>
                  setDraft((d) => ({ ...d, tenantId, subscriptionId: '', periodStart: '' }))
                }
                options={tenantOptions(tenants)}
                placeholder="Select organization"
                searchPlaceholder="Search organizations"
              />
            </FormField>
            <FormField
              label="Subscription"
              htmlFor="invoice-subscription"
              hint={
                draft.tenantId && tenantSubs.length === 0
                  ? 'This organization has no subscriptions.'
                  : undefined
              }
            >
              <Combobox
                id="invoice-subscription"
                value={draft.subscriptionId}
                onChange={selectSubscription}
                options={subscriptionOptions(tenantSubs, applicationsById)}
                placeholder="Select subscription"
                searchPlaceholder="Search applications"
                disabled={!draft.tenantId}
              />
            </FormField>
            <FormField
              label="Period start"
              htmlFor="invoice-period-start"
              hint={
                preview
                  ? `Covers ${fmtDate(preview.periodStart)} to ${fmtDate(preview.periodEnd)}.`
                  : 'Prefilled from the current period of the subscription.'
              }
            >
              <Input
                id="invoice-period-start"
                type="date"
                value={draft.periodStart}
                onChange={(e) => set('periodStart', e.target.value)}
                disabled={!subscription}
                required
              />
            </FormField>
            <FormField
              label="Tax rate (%)"
              htmlFor="invoice-tax"
              hint="PPN, applied to the subtotal."
            >
              <Input
                id="invoice-tax"
                type="number"
                min={0}
                max={100}
                step={1}
                value={String(draft.taxPercent)}
                onChange={(e) => set('taxPercent', Number(e.target.value))}
                required
              />
            </FormField>
            <dl className="bg-surface space-y-1.5 rounded-2xl px-4 py-3 text-sm sm:col-span-2">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal (subscription price)</dt>
                <dd className="tabular-nums">
                  {preview ? fmtIdr(invoiceSubtotal(preview), preview.currency) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">PPN {draft.taxPercent}%</dt>
                <dd className="tabular-nums">
                  {preview ? fmtIdr(invoiceTax(preview), preview.currency) : '—'}
                </dd>
              </div>
              <div className="border-border flex justify-between border-t pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {preview ? fmtIdr(preview.total, preview.currency) : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!preview}>
              Create invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
