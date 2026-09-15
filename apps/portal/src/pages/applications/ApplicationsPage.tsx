import { fmtNumber } from '@scp/fixtures'
import type { AppAccessState, ApplicationType } from '@scp/types'
import {
  APPLICATION_TYPE_LABEL,
  APP_ACCESS_STATE_LABEL,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Badge,
  Card,
  EmptyState,
  KeyValue,
  PageHeader,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@scp/ui'
import { AlertTriangle, AppWindow, CheckCircle2, LayoutGrid, Receipt } from 'lucide-react'
import * as React from 'react'
import { useAuth } from '../../auth/auth'
import { ACCESS_TONE, AppCard, pricingLine } from '../../components/AppCard'
import { SubscriptionBadge } from '../../components/badges'
import {
  ClearFiltersButton,
  FilterCombobox,
  labelOptions,
  noMatches,
  useFilterParams,
} from '../../components/filters'
import { useScoped, type PortalApplication } from '../../state/app-state'

type Tab = 'all' | 'available' | 'attention' | 'not_subscribed'

const TAB_STATES: Record<Tab, AppAccessState[] | null> = {
  all: null,
  available: ['active', 'trial', 'payment_required'],
  attention: ['payment_required', 'suspended', 'expired'],
  not_subscribed: ['not_subscribed'],
}

const TYPES: ApplicationType[] = ['web', 'mobile', 'external']

type Billing = 'monthly' | 'annual' | 'free' | 'not_subscribed'
const BILLING_LABEL: Record<Billing, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  free: 'Free',
  not_subscribed: 'Not subscribed',
}

function billingOf({ app, subscription }: PortalApplication): Billing {
  if (app.accessPolicy === 'free') return 'free'
  return subscription?.billingPeriod ?? 'not_subscribed'
}

function isTab(value: string): value is Tab {
  return value in TAB_STATES
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
  const { values, set, clear, active } = useFilterParams(['view', 'q', 'type', 'billing'])
  const { applications } = useScoped()
  const [selected, setSelected] = React.useState<string | null>(null)

  const tab: Tab = isTab(values.view) ? values.view : 'all'
  const q = values.q.trim().toLowerCase()
  const states = TAB_STATES[tab]
  const visible = applications.filter(
    (item) =>
      (!states || states.includes(item.access.state)) &&
      (!q || item.app.name.toLowerCase().includes(q)) &&
      (!values.type || item.app.type === values.type) &&
      (!values.billing || billingOf(item) === values.billing),
  )
  const selectedItem = applications.find((item) => item.app.id === selected) ?? null

  const count = (list: AppAccessState[]) =>
    fmtNumber(applications.filter((item) => list.includes(item.access.state)).length)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Applications"
        description={
          q
            ? `Results for "${q}" · ${visible.length} of ${applications.length} applications`
            : 'Every application your organization can reach and where its subscription stands.'
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Available"
          value={count(['active', 'trial'])}
          hint="Active or on trial"
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="Needs attention"
          value={count(['payment_required', 'suspended', 'expired'])}
          hint="Payment required, suspended or expired"
          icon={<AlertTriangle />}
          tone="warning"
        />
        <StatCard
          label="Not subscribed"
          value={count(['not_subscribed'])}
          hint="Available to subscribe"
          icon={<Receipt />}
        />
        <StatCard
          label="Total"
          value={fmtNumber(applications.length)}
          hint="Published to your organization"
          icon={<LayoutGrid />}
          tone="ink"
        />
      </div>
      <Tabs variant="underline" value={tab} onValueChange={(v) => set('view', v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="attention">Needs attention</TabsTrigger>
          <TabsTrigger value="not_subscribed">Not subscribed</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        <FilterCombobox
          value={values.type}
          onChange={(v) => set('type', v)}
          options={labelOptions(APPLICATION_TYPE_LABEL, TYPES)}
          allLabel="All types"
          searchPlaceholder="Search types"
        />
        <FilterCombobox
          value={values.billing}
          onChange={(v) => set('billing', v)}
          options={labelOptions(BILLING_LABEL)}
          allLabel="All billing"
          searchPlaceholder="Search billing"
        />
        {active ? <ClearFiltersButton onClick={clear} /> : null}
      </div>
      {visible.length === 0 ? (
        <Card>
          {active ? (
            <EmptyState {...noMatches(clear)} />
          ) : (
            <EmptyState
              icon={<AppWindow />}
              title="No applications yet"
              description="Applications appear here as soon as the platform publishes them."
            />
          )}
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
