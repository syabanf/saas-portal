import type { Session, User } from '@scp/types'

export interface LoginResult {
  user: User
  session: Session
}

/**
 * The integration blackbox: the UI only ever imports this interface. Access decisions,
 * token exchange and subscription checks live in the backend; the frontend only reads state.
 */
export interface ControlPlaneApi {
  readonly mode: 'mock' | 'http'
  login(email: string): Promise<LoginResult>
  logout(sessionId: string): Promise<void>
}
