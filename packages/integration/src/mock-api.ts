import type { AppAction, AppState } from '@scp/fixtures'
import { newId } from '@scp/fixtures'
import type { Session } from '@scp/types'
import type { ControlPlaneApi } from './adapter'

export interface MockReaders {
  getState: () => AppState
  dispatch: (action: AppAction) => void
  latencyMs?: number
}

/** Serves the in-memory store as if it were the SaaS Control Plane identity service. */
export function createMockApi(readers: MockReaders): ControlPlaneApi {
  const wait = () => new Promise<void>((r) => setTimeout(r, readers.latencyMs ?? 250))

  return {
    mode: 'mock',

    async login(email) {
      await wait()
      const state = readers.getState()
      const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      if (!user || user.status === 'disabled') throw new Error('Unknown user or disabled account')
      const member = state.members.find((m) => m.userId === user.id)
      const tenantId = member?.tenantId ?? state.tenants[0]?.id ?? 'none'
      const now = Date.now()
      const session: Session = {
        id: newId('ses'),
        userId: user.id,
        tenantId,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 24 * 3_600_000).toISOString(),
        lastSeenAt: new Date(now).toISOString(),
        ip: '127.0.0.1',
        userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile browser' : 'Desktop browser',
        revoked: false,
      }
      readers.dispatch({
        type: 'sessions/create',
        session,
        actor: { id: user.id, name: user.name },
      })
      return { user, session }
    },

    async logout(sessionId) {
      const state = readers.getState()
      const session = state.sessions.find((s) => s.id === sessionId)
      const user = session ? state.users.find((u) => u.id === session.userId) : undefined
      if (session && user)
        readers.dispatch({
          type: 'sessions/revoke',
          id: sessionId,
          actor: { id: user.id, name: user.name },
        })
    },
  }
}
