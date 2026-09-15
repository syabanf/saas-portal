import type { Session } from '@scp/types'
import type { BadgeTone } from '@scp/ui'

export type SessionState = 'active' | 'expired' | 'revoked'

export const SESSION_STATE_LABEL: Record<SessionState, string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
}

export const SESSION_STATE_TONE: Record<SessionState, BadgeTone> = {
  active: 'success',
  revoked: 'muted',
  expired: 'default',
}

export function sessionState(s: Session, now: number): SessionState {
  if (s.revoked) return 'revoked'
  return new Date(s.expiresAt).getTime() < now ? 'expired' : 'active'
}
