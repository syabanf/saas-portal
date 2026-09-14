import { fmtDate, fmtIdr } from '@scp/fixtures'
import type { Application, Subscription } from '@scp/types'
import { BILLING_PERIOD_LABEL } from '@scp/types'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@scp/ui'
import { Plus, Receipt } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { SubscriptionBadge } from '../../components/badges'
import { SubscriptionDialog, emptySubscription } from '../../components/master/SubscriptionDialog'
import { useScoped } from '../../state/app-state'

/** Every organization subscribed to this application, newest period first. */
export function SubscriptionsCard({ app }: { app: Application }) {
  const { subscriptionsByApplication, tenantsById } = useScoped()
  const [creating, setCreating] = React.useState<Subscription | null>(null)
  const subs = (subscriptionsByApplication.get(app.id) ?? [])
    .slice()
    .sort((a, b) => b.currentPeriodEnd.localeCompare(a.currentPeriodEnd))

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          Subscriptions <Badge variant="muted">{subs.length}</Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreating(emptySubscription('', app.id))}
        >
          <Plus /> New subscription
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {subs.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="No subscriptions yet"
            description="Organizations that subscribe to this product appear here."
            action={
              <Button size="sm" onClick={() => setCreating(emptySubscription('', app.id))}>
                <Plus /> New subscription
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
                <Link
                  to={`/organizations/${s.tenantId}`}
                  className="block truncate text-sm font-semibold hover:underline"
                >
                  {tenantsById.get(s.tenantId)?.name ?? s.tenantId}
                </Link>
                <p className="text-muted truncate text-xs">
                  {BILLING_PERIOD_LABEL[s.billingPeriod]} ·{' '}
                  <span className="tabular-nums">{fmtIdr(s.price, s.currency)}</span> · period ends{' '}
                  {fmtDate(s.currentPeriodEnd)}
                </p>
              </div>
              <SubscriptionBadge status={s.status} />
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link to={`/subscriptions/${s.id}`}>Detail</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
      <SubscriptionDialog
        subscription={creating}
        onOpenChange={(open) => !open && setCreating(null)}
      />
    </Card>
  )
}
