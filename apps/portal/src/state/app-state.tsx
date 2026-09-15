import {
  APP_ACCESS_ORDER,
  appAccessFor,
  loadFixtures,
  reducer,
  type Actor,
  type AppAccess,
  type AppAction,
  type AppState,
} from '@scp/fixtures'
import type {
  Application,
  Invoice,
  Payment,
  Subscription,
  Tenant,
  TenantMember,
  User,
} from '@scp/types'
import * as React from 'react'
import { pushToast, useDemoStore } from '@scp/ui'
import { useSession } from '../auth/session'

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
    storageKey: 'scp.portal.store.v5',
    shared: import.meta.env.DEV,
  })
  const stateRef = React.useRef(state)
  stateRef.current = state

  const dispatch = React.useCallback<React.Dispatch<AppAction>>(
    (action) => {
      const before = stateRef.current
      storeDispatch(action)
      const feedback: Partial<Record<AppAction['type'], string>> = {
        'members/upsert': 'Member access saved',
        'members/remove': 'Member removed',
        'subscriptions/upsert': 'Subscription saved',
        'subscriptions/cancel': 'Subscription cancellation scheduled',
        'subscriptions/reactivate': 'Subscription reactivated',
        'subscriptions/changePeriod': 'Billing change scheduled',
        'subscriptions/cancelChange': 'Scheduled change cancelled',
        'payments/create': 'Payment request created',
        'payments/simulate': 'Payment completed',
        'sessions/revoke': 'Session revoked',
        'invitations/accept': 'Invitation accepted',
      }
      const undoable = new Set<AppAction['type']>([
        'members/upsert',
        'members/remove',
        'subscriptions/cancel',
        'subscriptions/reactivate',
        'subscriptions/changePeriod',
        'subscriptions/cancelChange',
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

export interface MemberWithUser extends TenantMember {
  user: User
}

/** An application as the organization sees it: its subscription and what the signed-in member may do with it. */
export interface PortalApplication {
  app: Application
  subscription: Subscription | null
  access: AppAccess
}

export interface ScopedViews {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  tenantId: string
  userId: string
  tenant: Tenant | null
  member: TenantMember | null
  members: MemberWithUser[]
  subscriptions: Subscription[]
  invoices: Invoice[]
  payments: Payment[]
  /** Active, user-facing applications sorted so openable ones come first. */
  applications: PortalApplication[]
  usersById: Map<string, User>
  applicationsById: Map<string, Application>
  subscriptionsById: Map<string, Subscription>
  invoicesById: Map<string, Invoice>
  subscriptionByApplication: Map<string, Subscription>
}

/** Everything a page needs, already narrowed to the signed-in organization. */
export function useScoped(): ScopedViews {
  const { state, dispatch } = useAppState()
  const { session } = useSession()
  const tenantId = session?.tenantId ?? ''
  const userId = session?.userId ?? ''
  return React.useMemo(() => {
    const now = Date.now()
    const usersById = indexBy(state.users)
    const subscriptions = state.subscriptions.filter((s) => s.tenantId === tenantId)
    const subscriptionByApplication = new Map(subscriptions.map((s) => [s.applicationId, s]))
    const invoices = state.invoices.filter((i) => i.tenantId === tenantId)
    const member = state.members.find((m) => m.tenantId === tenantId && m.userId === userId) ?? null
    const members = state.members
      .filter((m) => m.tenantId === tenantId)
      .flatMap<MemberWithUser>((m) => {
        const user = usersById.get(m.userId)
        return user ? [{ ...m, user }] : []
      })
    const applications = state.applications
      .filter((a) => a.status === 'active' && a.authMode !== 'service_only')
      .map<PortalApplication>((app) => {
        const subscription = subscriptionByApplication.get(app.id) ?? null
        return {
          app,
          subscription,
          access: appAccessFor(
            app,
            subscription,
            member,
            now,
            state.tenants.find((t) => t.id === tenantId),
          ),
        }
      })
      .sort(
        (a, b) =>
          APP_ACCESS_ORDER[a.access.state] - APP_ACCESS_ORDER[b.access.state] ||
          a.app.name.localeCompare(b.app.name),
      )
    return {
      state,
      dispatch,
      tenantId,
      userId,
      tenant: state.tenants.find((t) => t.id === tenantId) ?? null,
      member,
      members,
      subscriptions,
      invoices,
      payments: state.payments.filter((p) => p.tenantId === tenantId),
      applications,
      usersById,
      applicationsById: indexBy(state.applications),
      subscriptionsById: indexBy(subscriptions),
      invoicesById: indexBy(invoices),
      subscriptionByApplication,
    }
  }, [state, dispatch, tenantId, userId])
}
