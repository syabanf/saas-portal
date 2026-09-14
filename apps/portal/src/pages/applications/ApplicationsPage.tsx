import type { AppAccessState } from '@scp/types'
import {
  APPLICATION_TYPE_LABEL,
  APP_ACCESS_STATE_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValue,
  PageHeader,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@scp/ui'
import { AppWindow } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/auth'
import { ACCESS_TONE, AppCard, pricingLine } from '../../components/AppCard'
import { SubscriptionBadge } from '../../components/badges'
import { useScoped, type PortalApplication } from '../../state/app-state'

type Tab = 'all' | 'available' | 'attention' | 'not_subscribed'

const TAB_STATES: Record<Tab, AppAccessState[] | null> = {
  all: null,
  available: ['active', 'trial', 'payment_required'],
  attention: ['payment_required', 'suspended', 'expired'],
  not_subscribed: ['not_subscribed'],
}

function DetailsSheet({
  item,
  onOpenChange,
}: {
  item: PortalApplication | null
  onOpenChange: (open: boolean) => void
}) {
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md p-6">
        {item ? (
          <>
            <SheetTitle className="text-lg font-semibold">{item.app.name}</SheetTitle>
            <SheetDescription className="text-muted text-sm">
              {APPLICATION_TYPE_LABEL[item.app.type]}
            </SheetDescription>
            <KeyValue
              className="mt-4"
              rows={[
                ...(isAdmin
                  ? [
                      { label: 'Billing', value: pricingLine(item) },
                      {
                        label: 'Subscription',
                        value: item.subscription ? (
                          <SubscriptionBadge status={item.subscription.status} />
                        ) : (
                          <Badge variant="muted">Not subscribed</Badge>
                        ),
                      },
                      {
                        label: 'Allowed when',
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {item.app.allowedStatuses.map((s) => (
                              <Badge key={s} variant="default">
                                {SUBSCRIPTION_STATUS_LABEL[s]}
                              </Badge>
                            ))}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  label: 'Your access',
                  value: (
                    <Badge variant={ACCESS_TONE[item.access.state]}>
                      {APP_ACCESS_STATE_LABEL[item.access.state]}
                    </Badge>
                  ),
                },
              ]}
            />
            <div className="mt-6">
              <AppCard item={item} />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function ApplicationsPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const { applications } = useScoped()
  const [tab, setTab] = React.useState<Tab>('all')
  const [selected, setSelected] = React.useState<string | null>(null)

  const states = TAB_STATES[tab]
  const visible = applications.filter(
    (item) =>
      (!states || states.includes(item.access.state)) &&
      (!q || item.app.name.toLowerCase().includes(q)),
  )
  const selectedItem = applications.find((item) => item.app.id === selected) ?? null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Applications"
        description={
          q
            ? `Results for "${q}" · ${visible.length} of ${applications.length} applications`
            : 'Every application your organization can reach and where its subscription stands.'
        }
        actions={
          q ? (
            <Button variant="outline" asChild>
              <Link to="/applications">Clear search</Link>
            </Button>
          ) : null
        }
      />
      <Tabs variant="underline" value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="attention">Needs attention</TabsTrigger>
          <TabsTrigger value="not_subscribed">Not subscribed</TabsTrigger>
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AppWindow />}
            title={q ? 'No application matches' : 'Nothing in this view'}
            description={
              q
                ? 'Try another name, or browse all applications.'
                : 'Switch tabs to see the other applications.'
            }
            action={
              <Button variant="outline" asChild>
                <Link to="/applications" onClick={() => setTab('all')}>
                  Show all
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <AppCard key={item.app.id} item={item} onDetails={() => setSelected(item.app.id)} />
          ))}
        </div>
      )}
      <DetailsSheet item={selectedItem} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
