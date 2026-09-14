import type { Session, Tenant, TenantMember, User } from '@scp/types'
import * as React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useApi } from '../state/api'
import { useAppState } from '../state/app-state'
import {
  SessionContext,
  readSession,
  useSession,
  writeSession,
  type StoredSession,
} from './session'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = React.useState<StoredSession | null>(readSession)
  const setSession = React.useCallback((next: StoredSession | null) => {
    writeSession(next)
    setSessionState(next)
  }, [])
  const value = React.useMemo(() => ({ session, setSession }), [session, setSession])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

type LoginOutcome = { ok: true } | { ok: false; error: string }

interface AuthValue {
  session: StoredSession | null
  user: User | null
  member: TenantMember | null
  tenant: Tenant | null
  /** Every organization the user belongs to; the workspace menu switches between them. */
  tenants: Tenant[]
  liveSession: Session | null
  login: (email: string, preferredTenantId?: string | null) => Promise<LoginOutcome>
  switchTenant: (tenantId: string) => void
  logout: () => Promise<void>
}

/** Session plus the live user, membership and organization behind it. */
export function useAuth(): AuthValue {
  const { session, setSession } = useSession()
  const { state } = useAppState()
  const { api } = useApi()

  const user = React.useMemo(
    () =>
      session
        ? (state.users.find((u) => u.id === session.userId && !u.platformAdmin) ?? null)
        : null,
    [state.users, session],
  )
  const tenants = React.useMemo(() => {
    if (!user) return []
    const ids = new Set(
      state.members
        .filter((m) => m.userId === user.id && m.status === 'active')
        .map((m) => m.tenantId),
    )
    return state.tenants.filter((t) => ids.has(t.id))
  }, [state.members, state.tenants, user])
  const member = React.useMemo(
    () =>
      session && user
        ? (state.members.find((m) => m.tenantId === session.tenantId && m.userId === user.id) ??
          null)
        : null,
    [state.members, session, user],
  )
  const tenant = React.useMemo(
    () => (session ? (state.tenants.find((t) => t.id === session.tenantId) ?? null) : null),
    [state.tenants, session],
  )
  const liveSession = React.useMemo(
    () => (session ? (state.sessions.find((s) => s.id === session.sessionId) ?? null) : null),
    [state.sessions, session],
  )

  const login = React.useCallback<AuthValue['login']>(
    async (email, preferredTenantId) => {
      const account = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (
        account &&
        !account.platformAdmin &&
        !state.members.some((m) => m.userId === account.id && m.status === 'active')
      )
        return {
          ok: false,
          error:
            'Accept your workspace invitation first. If your link expired, ask your admin to renew it.',
        }
      let result
      try {
        result = await api.login(email.trim())
      } catch {
        return { ok: false, error: 'No account with that email.' }
      }
      if (result.user.platformAdmin) {
        await api.logout(result.session.id)
        return {
          ok: false,
          error:
            'This account is a platform admin. Use the admin console at http://localhost:5173.',
        }
      }
      const activeMemberships = state.members.filter(
        (m) => m.userId === result.user.id && m.status === 'active',
      )
      const tenantId =
        activeMemberships.find((m) => m.tenantId === preferredTenantId)?.tenantId ??
        activeMemberships[0]?.tenantId ??
        result.session.tenantId
      setSession({ userId: result.user.id, sessionId: result.session.id, tenantId })
      return { ok: true }
    },
    [api, state.members, state.users, setSession],
  )

  const switchTenant = React.useCallback(
    (tenantId: string) => {
      if (!session || session.tenantId === tenantId || !tenants.some((t) => t.id === tenantId))
        return
      setSession({ ...session, tenantId })
    },
    [session, setSession, tenants],
  )

  const logout = React.useCallback(async () => {
    if (session) await api.logout(session.sessionId)
    setSession(null)
  }, [api, session, setSession])

  return { session, user, member, tenant, tenants, liveSession, login, switchTenant, logout }
}

/** The signed-in user. Only call under RequireAuth. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser called outside an authenticated route')
  return user
}

export function RequireWorkspaceAdmin({ children }: { children: React.ReactNode }) {
  const { member } = useAuth()
  return member?.workspaceRole === 'workspace_admin' ? <>{children}</> : <Navigate to="/" replace />
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, user, member, logout, tenants, switchTenant } = useAuth()
  const location = useLocation()
  if (!session || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.status === 'disabled' || member?.status !== 'active')
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-xl font-bold">Workspace access unavailable</h1>
        <p>
          Your membership may need an invitation or have been removed. Contact your workspace admin.
        </p>
        {tenants.map((t) => (
          <button className="block underline" key={t.id} onClick={() => switchTenant(t.id)}>
            Switch to {t.name}
          </button>
        ))}
        <button className="underline" onClick={() => void logout()}>
          Sign out
        </button>
      </div>
    )
  return <>{children}</>
}
