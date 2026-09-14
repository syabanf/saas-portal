import type { TenantMember } from '@scp/types'
import { newId } from './ids'
export function invitationFields(
  now = Date.now(),
): Pick<TenantMember, 'invitationToken' | 'invitationExpiresAt' | 'invitationAcceptedAt'> {
  return {
    invitationToken: newId('invite'),
    invitationExpiresAt: new Date(now + 7 * 86400000).toISOString(),
    invitationAcceptedAt: undefined,
  }
}
