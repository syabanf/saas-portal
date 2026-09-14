import { appAccessFor, fmtDate, fmtIdr } from '@scp/fixtures'
import type { AppAccessState, Subscription, Tenant } from '@scp/types'
import { APP_ACCESS_STATE_LABEL, BILLING_PERIOD_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  IconTile,
  type BadgeTone,
} from '@scp/ui'
import { AppWindow, Plus } from 'lucide-react'
import * as React from 'react'
import { AppTypeIcon } from '../../components/badges'
import { pricingLine } from '../applications/ProductFields'
import { SubscriptionDialog, emptySubscription } from '../../components/master/SubscriptionDialog'
import { useScoped } from '../../state/app-state'

const ACCESS_TONE: Record<AppAccessState, BadgeTone> = {
  active: 'success',
  trial: 'info',
  payment_required: 'warning',
  suspended: 'danger',
  expired: 'muted',
  not_subscribed: 'outline',
  not_assigned: 'default',
  disabled: 'muted',
}

function subscribedPrice(subscription: Subscription): string {
  return `${fmtIdr(subscription.price, subscription.currency)} · ${BILLING_PERIOD_LABEL[subscription.billingPeriod]}`
}

/** What each active application shows for this organization's members. Display only: the backend enforces access. */
export function ApplicationAccessCard({ tenant }: { tenant: Tenant }) {
  const { applications, subscriptionsByTenant, membersByTenant } = useScoped()
  const [subscribing, setSubscribing] = React.useState<Subscription | null>(null)
  const now = Date.now()
  const subscriptions = subscriptionsByTenant.get(tenant.id) ?? []
  const firstMember = membersByTenant.get(tenant.id)?.[0] ?? null
  const apps = applications.filter((a) => a.status === 'active')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Product access <Badge variant="muted">{apps.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {apps.length === 0 ? (
          <EmptyState
            icon={<AppWindow />}
            title="No active products"
            description="Enable a product and it appears here with its access state."
          />
        ) : (
          apps.map((app) => {
            const subscription = subscriptions.find((s) => s.applicationId === app.id) ?? null
            const access = appAccessFor(app, subscription, firstMember, now)
            return (
              <div
                key={app.id}
                className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl p-3"
              >
                <IconTile tone="ink" size="sm">
                  <AppTypeIcon type={app.type} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{app.name}</p>
                  <p className="text-muted truncate text-xs tabular-nums">
                    {subscription ? subscribedPrice(subscription) : pricingLine(app)}
                    {access.until ? ` · until ${fmtDate(access.until)}` : ''}
                  </p>
                </div>
                <Badge variant={ACCESS_TONE[access.state]} dot>
                  {APP_ACCESS_STATE_LABEL[access.state]}
                </Badge>
                {app.accessPolicy === 'subscription' && !subscription ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubscribing(emptySubscription(tenant.id, app.id))}
                  >
                    <Plus /> Subscribe
                  </Button>
                ) : null}
              </div>
            )
          })
        )}
      </CardContent>
      <SubscriptionDialog
        subscription={subscribing}
        tenantId={tenant.id}
        onOpenChange={(open) => !open && setSubscribing(null)}
      />
    </Card>
  )
}
