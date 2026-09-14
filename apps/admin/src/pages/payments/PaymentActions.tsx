import { fmtIdr } from '@scp/fixtures'
import type { Payment, PaymentStatus } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@scp/ui'
import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'

export interface PaymentTransition {
  status: PaymentStatus
  label: string
  icon: LucideIcon
}

/** What the console can do to a pending request. "Mark paid" stands in for Xendit's PAID callback. */
export const PENDING_TRANSITIONS: PaymentTransition[] = [
  { status: 'success', label: 'Mark paid', icon: CheckCircle2 },
  { status: 'expired', label: 'Expire', icon: Clock },
  { status: 'failed', label: 'Mark failed', icon: XCircle },
]

export interface RefundPaymentDialogProps {
  /** null = closed. */
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}

export function RefundPaymentDialog({ payment, onOpenChange }: RefundPaymentDialogProps) {
  const { tenantsById, dispatch } = useScoped()
  const user = useCurrentUser()

  function refund() {
    if (!payment) return
    dispatch({
      type: 'payments/setStatus',
      id: payment.id,
      status: 'refunded',
      actor: actorOf(user),
    })
    onOpenChange(false)
  }

  return (
    <AlertDialog open={payment !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refund payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {payment
              ? `${fmtIdr(payment.amount, payment.currency)} goes back to ${tenantsById.get(payment.tenantId)?.name ?? 'the organization'} and the invoice is voided. The subscription keeps its current status.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={refund}>Refund</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
