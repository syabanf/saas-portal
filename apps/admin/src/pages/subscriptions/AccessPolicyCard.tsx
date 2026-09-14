import type { AccessPolicyOutcome, Application, Subscription } from '@scp/types'
import {
  SUBSCRIPTION_ACCESS_POLICY,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  type BadgeTone,
} from '@scp/ui'
import { SubscriptionBadge } from '../../components/badges'

const OUTCOME: Record<AccessPolicyOutcome, { label: string; tone: BadgeTone }> = {
  allow: { label: 'Allow', tone: 'success' },
  allow_warning: { label: 'Allow + warning', tone: 'warning' },
  allow_until_end: { label: 'Allow until period end', tone: 'info' },
  deny: { label: 'Deny', tone: 'danger' },
}

/** Blueprint §25 policy table. The backend enforces it; this card only explains it. */
export function AccessPolicyCard({
  subscription,
  application,
}: {
  subscription: Subscription
  application: Application | undefined
}) {
  const admitted = application?.allowedStatuses.includes(subscription.status) ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access policy</CardTitle>
        <CardDescription>
          What each subscription status means for application access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <tbody>
              {SUBSCRIPTION_STATUSES.map((st) => {
                const o = OUTCOME[SUBSCRIPTION_ACCESS_POLICY[st]]
                const current = st === subscription.status
                return (
                  <tr
                    key={st}
                    className={cn(
                      'border-border border-b last:border-0',
                      current && 'bg-surface-2',
                    )}
                  >
                    <td className={cn('px-3 py-2', current && 'font-semibold')}>
                      {SUBSCRIPTION_STATUS_LABEL[st]}
                      {current ? (
                        <span className="text-muted ml-2 text-[11px] font-semibold tracking-wider uppercase">
                          current
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant={o.tone}>{o.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-2 rounded-2xl p-4">
          <p className="text-sm font-semibold">Enforced by the backend</p>
          {application ? (
            <>
              <p className="text-muted mt-1 text-xs">
                Every request to {application.name} is checked against this subscription. The
                application admits these statuses
                {admitted
                  ? ', including the current one.'
                  : '. The current status is not among them, so access is denied.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {application.allowedStatuses.map((st) => (
                  <SubscriptionBadge key={st} status={st} dot={false} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted mt-1 text-xs">
              The application behind this subscription no longer exists, so every request is denied.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
