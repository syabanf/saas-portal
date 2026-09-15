import { fmtDateTime, fmtIdr } from '@scp/fixtures'
import type { Payment, PaymentStatus } from '@scp/types'
import type { ReactNode } from 'react'
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

/** When the request actually expired: the recorded event, or the scheduled expiry if it lapsed on its own. */
export function expiredAt(payment: Payment): string | null {
  return payment.events.find((e) => e.type === 'expired')?.at ?? payment.expiresAt
}

/** The "Paid / expires" cell: when the money arrived, when the request lapsed, or when it will. */
export function settledLabel(payment: Payment): ReactNode {
  if (payment.paidAt) return fmtDateTime(payment.paidAt)
  if (payment.status === 'expired') return `Expired ${fmtDateTime(expiredAt(payment))}`
  if (payment.status === 'pending' && payment.expiresAt)
    return `Expires ${fmtDateTime(payment.expiresAt)}`
  return <span className="text-muted">—</span>
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
