import { loadFixtures, reducer, type Actor, type AppAction, type AppState } from '@scp/fixtures'
import type {
  ApiClient,
  Application,
  Invoice,
  Payment,
  Subscription,
  SubscriptionEvent,
  Tenant,
  TenantMember,
  User,
  WebhookDelivery,
  WebhookEndpoint,
} from '@scp/types'
import * as React from 'react'
import { pushToast, useDemoStore } from '@scp/ui'

interface AppStateContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  resetDemo: () => void
}

const AppStateContext = React.createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const {
    state,
    dispatch: storeDispatch,
    ready,
    error,
    retry,
    pending,
  } = useDemoStore({
    initial: loadFixtures,
    reducer,
    storageKey: 'scp.admin.store.v5',
    shared: import.meta.env.DEV,
  })
  const stateRef = React.useRef(state)
  stateRef.current = state

  const dispatch = React.useCallback<React.Dispatch<AppAction>>(
    (action) => {
      const before = stateRef.current
      storeDispatch(action)
      const feedback: Partial<Record<AppAction['type'], string>> = {
        'tenants/upsert': 'Organization saved',
        'tenants/remove': 'Organization deleted',
        'tenants/setStatus': 'Organization status updated',
        'members/upsert': 'Member access saved',
        'members/remove': 'Member removed',
        'applications/upsert': 'Application saved',
        'applications/remove': 'Application deleted',
        'subscriptions/upsert': 'Subscription saved',
        'subscriptions/setStatus': 'Subscription status updated',
        'subscriptions/cancel': 'Subscription cancellation scheduled',
        'subscriptions/reactivate': 'Subscription reactivated',
        'subscriptions/changePeriod': 'Billing change scheduled',
        'subscriptions/cancelChange': 'Scheduled change cancelled',
        'apiClients/create': 'API client created',
        'apiClients/rotate': 'API secret rotated',
        'apiClients/revoke': 'API client revoked',
        'invoices/generate': 'Invoice generated',
        'payments/create': 'Payment request created',
        'payments/simulate': 'Payment simulation completed',
        'payments/setStatus': 'Payment status updated',
        'webhooks/upsert': 'Webhook saved',
        'webhooks/remove': 'Webhook deleted',
        'webhooks/retry': 'Webhook retry queued',
        'webhooks/test': 'Test webhook sent',
        'sessions/revoke': 'Session revoked',
      }
      const undoable = new Set<AppAction['type']>([
        'tenants/setStatus',
        'members/remove',
        'subscriptions/setStatus',
        'subscriptions/cancel',
        'subscriptions/reactivate',
        'subscriptions/changePeriod',
        'subscriptions/cancelChange',
        'webhooks/retry',
        'sessions/revoke',
      ])
      const title = feedback[action.type]
      if (title)
        pushToast({
          title,
          action: undoable.has(action.type)
            ? {
                label: 'Undo',
                onClick: () => {
                  storeDispatch({ type: 'store/replace', state: before })
                  pushToast({ title: 'Change undone', tone: 'info' })
                },
              }
            : undefined,
        })
    },
    [storeDispatch],
  )

  React.useEffect(() => {
    if (import.meta.env.DEV) return
    const timer = window.setInterval(() => dispatch({ type: 'store/tick' }), 1000)
    return () => clearInterval(timer)
  }, [dispatch])
  const resetDemo = React.useCallback(() => {
    dispatch({ type: 'store/replace', state: loadFixtures() })
  }, [dispatch])

  const value = React.useMemo(() => ({ state, dispatch, resetDemo }), [state, dispatch, resetDemo])
  return (
    <AppStateContext.Provider value={value}>
      {error && (
        <div role="alert" className="bg-danger-soft p-3 text-sm">
          {error}{' '}
          <button className="underline" onClick={() => void retry()}>
            Retry
          </button>
        </div>
      )}
      {pending && !error && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="bg-surface-2 px-3 text-xs"
        >
          Saving changes…
        </div>
      )}
      {ready ? children : <div className="p-8">Loading shared workspace…</div>}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const ctx = React.useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}

/** Small helper so pages never spell out the actor shape. */
export function actorOf(user: { id: string; name: string }): Actor {
  return { id: user.id, name: user.name }
}

function indexBy<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]))
}

function groupBy<T>(list: T[], key: (x: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const item of list) {
    const k = key(item)
    const bucket = out.get(k)
    if (bucket) bucket.push(item)
    else out.set(k, [item])
  }
  return out
}

export interface ScopedViews {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  tenants: Tenant[]
  users: User[]
  members: TenantMember[]
  applications: Application[]
  subscriptions: Subscription[]
  apiClients: ApiClient[]
  webhooks: WebhookEndpoint[]
  invoices: Invoice[]
  payments: Payment[]
  tenantsById: Map<string, Tenant>
  usersById: Map<string, User>
  applicationsById: Map<string, Application>
  subscriptionsById: Map<string, Subscription>
  webhooksById: Map<string, WebhookEndpoint>
  invoicesById: Map<string, Invoice>
  subscriptionsByTenant: Map<string, Subscription[]>
  membersByTenant: Map<string, TenantMember[]>
  membersByUser: Map<string, TenantMember[]>
  subscriptionsByApplication: Map<string, Subscription[]>
  eventsBySubscription: Map<string, SubscriptionEvent[]>
  invoicesByTenant: Map<string, Invoice[]>
  clientsByApplication: Map<string, ApiClient[]>
  webhooksByApplication: Map<string, WebhookEndpoint[]>
  deliveriesByEndpoint: Map<string, WebhookDelivery[]>
}

/** Platform-admin scope sees everything; the maps are the live lookups pages use. */
export function useScoped(): ScopedViews {
  const { state, dispatch } = useAppState()
  return React.useMemo(
    () => ({
      state,
      dispatch,
      tenants: state.tenants,
      users: state.users,
      members: state.members,
      applications: state.applications,
      subscriptions: state.subscriptions,
      apiClients: state.apiClients,
      webhooks: state.webhooks,
      invoices: state.invoices,
      payments: state.payments,
      tenantsById: indexBy(state.tenants),
      usersById: indexBy(state.users),
      applicationsById: indexBy(state.applications),
      subscriptionsById: indexBy(state.subscriptions),
      webhooksById: indexBy(state.webhooks),
      invoicesById: indexBy(state.invoices),
      subscriptionsByTenant: groupBy(state.subscriptions, (s) => s.tenantId),
      membersByTenant: groupBy(state.members, (m) => m.tenantId),
      membersByUser: groupBy(state.members, (m) => m.userId),
      subscriptionsByApplication: groupBy(state.subscriptions, (s) => s.applicationId),
      eventsBySubscription: groupBy(state.subscriptionEvents, (e) => e.subscriptionId),
      invoicesByTenant: groupBy(state.invoices, (i) => i.tenantId),
      clientsByApplication: groupBy(state.apiClients, (c) => c.applicationId),
      webhooksByApplication: groupBy(state.webhooks, (w) => w.applicationId),
      deliveriesByEndpoint: groupBy(state.deliveries, (d) => d.endpointId),
    }),
    [state, dispatch],
  )
}
