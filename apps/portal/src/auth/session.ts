import * as React from 'react'

const SESSION_KEY = 'scp.portal.session'

/** What survives a reload: who is signed in and which organization is active. */
export interface StoredSession {
  userId: string
  sessionId: string
  tenantId: string
}

export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export function writeSession(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable; the session stays in memory */
  }
}

export interface SessionContextValue {
  session: StoredSession | null
  setSession: (session: StoredSession | null) => void
}

export const SessionContext = React.createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside AuthProvider')
  return ctx
}
