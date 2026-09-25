import { fmtNumber } from '@scp/fixtures'
import { useT } from '@scp/i18n'
import type { AppAccessState, ApplicationType } from '@scp/types'
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
  enumOptions,
  useFilterParams,
  useNoMatches,
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
const BILLINGS: Billing[] = ['monthly', 'annual', 'free', 'not_subscribed']

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
  const t = useT()
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md p-6">
        {item ? (
          <>
            <SheetTitle className="text-lg font-semibold">{item.app.name}</SheetTitle>
            <SheetDescription className="text-muted text-sm">
              {t(`appType.${item.app.type}`)}
            </SheetDescription>
            <KeyValue
              className="mt-4"
              rows={[
                ...(isAdmin
                  ? [
                      { label: t('applications.details.billing'), value: pricingLine(t, item) },
                      {
                        label: t('common.subscription'),
                        value: item.subscription ? (
                          <SubscriptionBadge status={item.subscription.status} />
                        ) : (
                          <Badge variant="muted">{t('common.notSubscribed')}</Badge>
                        ),
                      },
                      {
                        label: t('applications.details.allowedWhen'),
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {item.app.allowedStatuses.map((s) => (
                              <Badge key={s} variant="default">
                                {t(`status.subscription.${s}`)}
                              </Badge>
                            ))}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  label: t('applications.details.yourAccess'),
                  value: (
                    <Badge variant={ACCESS_TONE[item.access.state]}>
                      {t(`status.access.${item.access.state}`)}
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
  const t = useT()
  const noMatches = useNoMatches()
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

  const billingLabel = (value: Billing) =>
    value === 'free'
      ? t('applications.billing.free')
      : value === 'not_subscribed'
        ? t('common.notSubscribed')
        : t(`period.${value}`)

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.applications')}
        description={
          q
            ? t('applications.results', {
                query: q,
                visible: visible.length,
                total: applications.length,
              })
            : t('applications.description')
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('applications.available')}
          value={count(['active', 'trial'])}
          hint={t('applications.availableHint')}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label={t('applications.attention')}
          value={count(['payment_required', 'suspended', 'expired'])}
          hint={t('applications.attentionHint')}
          icon={<AlertTriangle />}
          tone="warning"
        />
        <StatCard
          label={t('common.notSubscribed')}
          value={count(['not_subscribed'])}
          hint={t('applications.notSubscribedHint')}
          icon={<Receipt />}
        />
        <StatCard
          label={t('applications.total')}
          value={fmtNumber(applications.length)}
          hint={t('applications.totalHint')}
          icon={<LayoutGrid />}
          tone="ink"
        />
      </div>
      <Tabs variant="underline" value={tab} onValueChange={(v) => set('view', v)}>
        <TabsList>
          <TabsTrigger value="all">{t('applications.tab.all')}</TabsTrigger>
          <TabsTrigger value="available">{t('applications.available')}</TabsTrigger>
          <TabsTrigger value="attention">{t('applications.attention')}</TabsTrigger>
          <TabsTrigger value="not_subscribed">{t('common.notSubscribed')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        <FilterCombobox
          value={values.type}
          onChange={(v) => set('type', v)}
          options={enumOptions(TYPES, (type) => t(`appType.${type}`))}
          allLabel={t('applications.allTypes')}
          searchPlaceholder={t('applications.searchTypes')}
        />
        <FilterCombobox
          value={values.billing}
          onChange={(v) => set('billing', v)}
          options={enumOptions(BILLINGS, billingLabel)}
          allLabel={t('applications.allBilling')}
          searchPlaceholder={t('applications.searchBilling')}
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
              title={t('home.noApplications')}
              description={t('home.noApplicationsDescription')}
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
