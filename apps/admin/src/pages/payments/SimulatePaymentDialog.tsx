import type { PaymentChannel } from '@scp/types'
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
} from '@scp/ui'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'
import { invoiceOptions } from '../../lib/options'
import { ChannelSelect } from './ChannelSelect'

export interface SimulatePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Pick an unpaid invoice and a Xendit channel, then either leave the request pending or settle it (blueprint §26, §74). */
export function SimulatePaymentDialog({ open, onOpenChange }: SimulatePaymentDialogProps) {
  const { invoices, tenantsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const [invoiceId, setInvoiceId] = React.useState('')
  const [channel, setChannel] = React.useState<PaymentChannel>('BCA')
  React.useEffect(() => {
    if (open) {
      setInvoiceId('')
      setChannel('BCA')
    }
  }, [open])

  const unpaid = invoices.filter((i) => i.status === 'open' || i.status === 'overdue')

  function submit(settle: boolean) {
    if (!invoiceId) return
    const actor = actorOf(user)
    dispatch(
      settle
        ? { type: 'payments/simulate', invoiceId, channel, actor }
        : { type: 'payments/create', invoiceId, channel, actor },
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(false)
          }}
        >
          <DialogHeader>
            <DialogTitle>Create payment request</DialogTitle>
            <DialogDescription>
              Creates a Xendit payment request for the invoice. Settling it marks the invoice paid
              and reactivates the subscription through the normal event chain.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <FormField
              label="Invoice"
              htmlFor="payment-invoice"
              hint={
                unpaid.length === 0
                  ? 'Every invoice is already paid, void or still a draft.'
                  : undefined
              }
            >
              <Combobox
                id="payment-invoice"
                value={invoiceId}
                onChange={setInvoiceId}
                options={invoiceOptions(unpaid, tenantsById)}
                placeholder="Select invoice"
                searchPlaceholder="Search organization or invoice number"
                disabled={unpaid.length === 0}
              />
            </FormField>
            <FormField label="Channel" htmlFor="payment-channel">
              <ChannelSelect id="payment-channel" value={channel} onChange={setChannel} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={!invoiceId}>
              Create request
            </Button>
            <Button type="button" disabled={!invoiceId} onClick={() => submit(true)}>
              Create and settle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
