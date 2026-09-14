import { fmtDate, fmtIdr } from '@scp/fixtures'
import type { Subscription, SubscriptionStatus, Tenant } from '@scp/types'
import { BILLING_PERIOD_LABEL, SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
} from '@scp/ui'
import { Plus, Receipt } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { SubscriptionBadge } from '../../components/badges'
import { SubscriptionDialog, emptySubscription } from '../../components/master/SubscriptionDialog'
import { actorOf, useScoped } from '../../state/app-state'

export function SubscriptionsCard({ tenant }: { tenant: Tenant }) {
  const { subscriptionsByTenant, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const [editing, setEditing] = React.useState<Subscription | null>(null)
  const subs = subscriptionsByTenant.get(tenant.id) ?? []

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          Subscriptions <Badge variant="muted">{subs.length}</Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(emptySubscription(tenant.id))}
        >
          <Plus /> Add subscription
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {subs.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="No subscriptions yet"
            description="Subscribe this organization to an application so its members can open it."
            action={
              <Button size="sm" onClick={() => setEditing(emptySubscription(tenant.id))}>
                <Plus /> Add subscription
              </Button>
            }
          />
        ) : (
          subs.map((s) => (
            <div
              key={s.id}
              className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {applicationsById.get(s.applicationId)?.name ?? 'Application'}
                </p>
                <p className="text-muted truncate text-xs">
                  {BILLING_PERIOD_LABEL[s.billingPeriod]} ·{' '}
                  <span className="tabular-nums">{fmtIdr(s.price, s.currency)}</span> · period ends{' '}
                  {fmtDate(s.currentPeriodEnd)}
                </p>
              </div>
              {s.scheduledChange && (
                <p className="text-muted text-xs">
                  Scheduled: {BILLING_PERIOD_LABEL[s.scheduledChange.billingPeriod]} ·{' '}
                  {fmtIdr(s.scheduledChange.price, s.currency)} from{' '}
                  {fmtDate(s.scheduledChange.effectiveAt)}
                </p>
              )}
              <SubscriptionBadge status={s.status} />
              <Select
                tone="ghost"
                value={s.status}
                aria-label="Change status"
                onChange={(e) =>
                  dispatch({
                    type: 'subscriptions/setStatus',
                    id: s.id,
                    status: e.target.value as SubscriptionStatus,
                    note: 'Changed from organization page',
                    actor: actorOf(user),
                  })
                }
              >
                {SUBSCRIPTION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {SUBSCRIPTION_STATUS_LABEL[st]}
                  </option>
                ))}
              </Select>
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link to={`/subscriptions/${s.id}`}>Detail</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
      <SubscriptionDialog
        subscription={editing}
        tenantId={tenant.id}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </Card>
  )
}
