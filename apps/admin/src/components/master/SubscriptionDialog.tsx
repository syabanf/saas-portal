import { buildInvoice, newId, nextInvoiceNumber, priceFor } from '@scp/fixtures'
import type { BillingPeriod, Subscription, SubscriptionStatus } from '@scp/types'
import {
  BILLING_PERIODS,
  BILLING_PERIOD_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
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
  ToggleRow,
} from '@scp/ui'
import { fmtIdr } from '@scp/fixtures'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { applicationOptions, labelOptions, tenantOptions } from '../../lib/options'
import { actorOf, useScoped } from '../../state/app-state'

const DAY = 86_400_000

export function emptySubscription(tenantId = '', applicationId = ''): Subscription {
  const now = new Date().toISOString()
  return {
    id: '',
    tenantId,
    applicationId,
    billingPeriod: 'annual',
    price: 0,
    currency: 'IDR',
    status: 'active',
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd: now,
    gracePeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  }
}

export interface SubscriptionDialogProps {
  /** null = closed; `id === ''` = create. */
  subscription: Subscription | null
  /** Lock the tenant when opened from an organization page. */
  tenantId?: string
  onOpenChange: (open: boolean) => void
}

export function SubscriptionDialog({
  subscription,
  tenantId,
  onOpenChange,
}: SubscriptionDialogProps) {
  const { tenants, applications, applicationsById, subscriptionsByTenant, invoices, dispatch } =
    useScoped()
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState<Subscription>(
    () => subscription ?? emptySubscription(tenantId),
  )
  React.useEffect(() => {
    if (subscription) setDraft({ ...subscription, tenantId: tenantId ?? subscription.tenantId })
  }, [subscription, tenantId])

  const isCreate = draft.id === ''
  const app = applicationsById.get(draft.applicationId)
  const subscribedAppIds = new Set(
    (subscriptionsByTenant.get(draft.tenantId) ?? []).map((s) => s.applicationId),
  )
  const price = app ? priceFor(app, draft.billingPeriod) : 0
  const canSave = Boolean(draft.tenantId && app)
  const subscribable = applications.filter(
    (a) =>
      a.accessPolicy === 'subscription' &&
      (!isCreate || !subscribedAppIds.has(a.id) || a.id === draft.applicationId),
  )

  function set<K extends keyof Subscription>(key: K, value: Subscription[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || !app) return
    const now = Date.now()
    const periodDays = draft.billingPeriod === 'annual' ? 365 : 30
    const status: SubscriptionStatus = draft.status
    const next: Subscription = isCreate
      ? {
          ...draft,
          id: newId('sub'),
          price,
          currency: app.currency,
          startedAt: new Date(now).toISOString(),
          currentPeriodStart: new Date(now).toISOString(),
          currentPeriodEnd: new Date(
            now + (status === 'trial' ? app.trialDays || 14 : periodDays) * DAY,
          ).toISOString(),
          gracePeriodEnd: status === 'grace_period' ? new Date(now + 7 * DAY).toISOString() : null,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        }
      : { ...draft, price, currency: app.currency, updatedAt: new Date(now).toISOString() }
    dispatch({ type: 'subscriptions/upsert', subscription: next, actor: actorOf(user) })
    if (isCreate && status !== 'draft' && status !== 'trial') {
      const invoice = buildInvoice(next, app, {
        id: newId('inv'),
        number: nextInvoiceNumber(invoices, now),
        periodStart: next.currentPeriodStart,
        issuedAt: next.currentPeriodStart,
        status: status === 'active' ? 'paid' : 'open',
        paidAt: status === 'active' ? new Date(now).toISOString() : null,
      })
      dispatch({ type: 'invoices/upsert', invoice })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={subscription !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New subscription' : 'Edit subscription'}</DialogTitle>
            <DialogDescription>
              A subscription gives one organization access to one application, billed monthly or
              annually.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Organization" htmlFor="subscription-tenant">
              <Combobox
                id="subscription-tenant"
                value={draft.tenantId}
                onChange={(v) => set('tenantId', v)}
                options={tenantOptions(tenants)}
                placeholder="Select organization"
                searchPlaceholder="Search organizations"
                disabled={Boolean(tenantId) || !isCreate}
              />
            </FormField>
            <FormField
              label="Application"
              htmlFor="subscription-application"
              hint={
                isCreate && draft.tenantId && subscribedAppIds.size > 0
                  ? 'Applications already subscribed are hidden.'
                  : undefined
              }
            >
              <Combobox
                id="subscription-application"
                value={draft.applicationId}
                onChange={(v) => set('applicationId', v)}
                options={applicationOptions(subscribable)}
                placeholder="Select application"
                searchPlaceholder="Search applications"
                disabled={!isCreate}
              />
            </FormField>
            <FormField
              label="Billing period"
              htmlFor="subscription-period"
              hint={
                app
                  ? `${fmtIdr(price, app.currency)} per ${draft.billingPeriod === 'annual' ? 'year' : 'month'}${app.trialDays ? ` · trial ${app.trialDays} days` : ''}`
                  : undefined
              }
            >
              <Combobox
                id="subscription-period"
                value={draft.billingPeriod}
                onChange={(v) => set('billingPeriod', v as BillingPeriod)}
                options={labelOptions(BILLING_PERIODS, BILLING_PERIOD_LABEL)}
              />
            </FormField>
            <FormField label="Status" htmlFor="subscription-status">
              <Combobox
                id="subscription-status"
                value={draft.status}
                onChange={(v) => set('status', v as SubscriptionStatus)}
                options={labelOptions(SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABEL)}
              />
            </FormField>
            <div className="sm:col-span-2">
              <ToggleRow
                title="Cancel at period end"
                description="Access continues until the current period ends."
                checked={draft.cancelAtPeriodEnd}
                onCheckedChange={(v) => set('cancelAtPeriodEnd', v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {isCreate ? 'Create subscription' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
