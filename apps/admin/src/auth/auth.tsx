import type { User } from '@scp/types'
import * as React from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAppState } from '../state/app-state'

const SESSION_KEY = 'scp.admin.session'

interface AuthContextValue {
  user: User | null
  login: (email: string) => { ok: true } | { ok: false; error: string }
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useAppState()
  const [userId, setUserId] = React.useState<string | null>(readSession)
  const user = React.useMemo(
    () => state.users.find((u) => u.id === userId && u.platformAdmin) ?? null,
    [state.users, userId],
  )

  const login = React.useCallback<AuthContextValue['login']>(
    (email) => {
      const found = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!found) return { ok: false, error: 'No account with that email.' }
      if (!found.platformAdmin)
        return {
          ok: false,
          error: 'This account is not a platform admin. Use the SaaS Portal instead.',
        }
      try {
        localStorage.setItem(SESSION_KEY, found.id)
      } catch {
        /* ignore */
      }
      setUserId(found.id)
      dispatch({
        type: 'audit/append',
        entry: {
          actorId: found.id,
          actorName: found.name,
          tenantId: null,
          action: 'user.login',
          resourceType: 'session',
          resourceId: 'admin-console',
          before: null,
          after: { console: 'platform-admin' },
          requestId: null,
          sourceIp: null,
          at: new Date().toISOString(),
        },
      })
      return { ok: true }
    },
    [state.users, dispatch],
  )

  const logout = React.useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
    setUserId(null)
  }, [])

  const value = React.useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** The signed-in platform admin. Only call under RequireAuth. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser called outside an authenticated route')
  return user
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
