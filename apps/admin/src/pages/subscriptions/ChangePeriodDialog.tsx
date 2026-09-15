import { fmtDate, fmtIdr, priceFor } from '@scp/fixtures'
import type { BillingPeriod, Subscription } from '@scp/types'
import { BILLING_PERIODS, BILLING_PERIOD_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  OptionCard,
} from '@scp/ui'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'

export interface ChangePeriodDialogProps {
  /** null = closed. */
  subscription: Subscription | null
  onOpenChange: (open: boolean) => void
}

/** Switches a subscription between monthly and annual billing; the price is re-read from the application. */
export function ChangePeriodDialog({ subscription, onOpenChange }: ChangePeriodDialogProps) {
  const { applicationsById, invoices, dispatch } = useScoped()
  const user = useCurrentUser()
  const [period, setPeriod] = React.useState<BillingPeriod>(
    subscription?.billingPeriod ?? 'monthly',
  )
  React.useEffect(() => {
    if (subscription) setPeriod(subscription.billingPeriod)
  }, [subscription])

  const app = subscription ? applicationsById.get(subscription.applicationId) : undefined
  const renewalInvoiced = Boolean(
    subscription &&
    invoices.some(
      (i) =>
        i.subscriptionId === subscription.id &&
        i.status !== 'void' &&
        i.periodStart >= subscription.currentPeriodEnd,
    ),
  )
  const canSave = Boolean(
    subscription &&
    app &&
    !renewalInvoiced &&
    !subscription.cancelAtPeriodEnd &&
    period !== subscription.billingPeriod &&
    priceFor(app, period) > 0,
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subscription || !canSave) return
    dispatch({
      type: 'subscriptions/changePeriod',
      id: subscription.id,
      billingPeriod: period,
      actor: actorOf(user),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={subscription !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Change billing period</DialogTitle>
            <DialogDescription>
              The current price stays in place. The new billing period starts on{' '}
              {fmtDate(subscription?.currentPeriodEnd)}.
            </DialogDescription>
          </DialogHeader>
          {renewalInvoiced && (
            <p className="text-muted text-sm">
              The next period is already invoiced. Resolve that invoice before scheduling a change.
            </p>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <p className="text-muted text-sm">
              This subscription ends at the current period. Reactivate it before changing the
              billing period.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3">
            {BILLING_PERIODS.map((p) => {
              const price = app ? priceFor(app, p) : 0
              return (
                <OptionCard
                  key={p}
                  selected={period === p}
                  title={BILLING_PERIOD_LABEL[p]}
                  description={
                    app
                      ? price > 0
                        ? `${fmtIdr(price, app.currency)} per ${p === 'annual' ? 'year' : 'month'}`
                        : 'Not offered by this application'
                      : undefined
                  }
                  badge={
                    subscription?.billingPeriod === p ? (
                      <Badge variant="muted">Current</Badge>
                    ) : undefined
                  }
                  disabled={price === 0}
                  onSelect={() => setPeriod(p)}
                />
              )
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              Change billing period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
