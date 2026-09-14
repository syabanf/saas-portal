import { fmtIdr } from '@scp/fixtures'
import type { Invoice, PaymentChannel } from '@scp/types'
import { PAYMENT_CHANNEL_BY_ID } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  FormField,
} from '@scp/ui'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'
import { ChannelSelect } from '../payments/ChannelSelect'

export interface SimulatePaymentConfirmProps {
  /** null = closed. */
  invoice: Invoice | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

/** Blueprint §74: payment.success → subscription active → webhooks, with no manual step in between. */
export function SimulatePaymentConfirm({
  invoice,
  onOpenChange,
  onDone,
}: SimulatePaymentConfirmProps) {
  const { dispatch } = useScoped()
  const user = useCurrentUser()
  const [channel, setChannel] = React.useState<PaymentChannel>('BCA')
  React.useEffect(() => {
    if (invoice) setChannel('BCA')
  }, [invoice])

  function confirm() {
    if (!invoice) return
    dispatch({ type: 'payments/simulate', invoiceId: invoice.id, channel, actor: actorOf(user) })
    onOpenChange(false)
    onDone?.()
  }

  return (
    <AlertDialog open={invoice !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Settle with Xendit (demo)?</AlertDialogTitle>
          <AlertDialogDescription>
            {invoice
              ? `Creates a ${PAYMENT_CHANNEL_BY_ID[channel].label} request for ${fmtIdr(invoice.total, invoice.currency)} on ${invoice.number} and settles it at once, as if Xendit sent the PAID callback. The invoice is marked paid, the subscription becomes Active and webhooks fire.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormField label="Channel" htmlFor="settle-channel">
          <ChannelSelect id="settle-channel" value={channel} onChange={setChannel} />
        </FormField>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-accent shadow-glow hover:bg-accent-strong"
            onClick={confirm}
          >
            Settle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
