import { fmtAgo, fmtDateTime, fmtMs } from '@scp/fixtures'
import type { AccessLog } from '@scp/types'
import { ACCESS_REASON_LABEL, AUDIT_ACTION_LABEL } from '@scp/types'
import {
  Badge,
  EmptyState,
  KeyValue,
  Kicker,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@scp/ui'
import { DecisionBadge, Mono } from '../../components/badges'
import { useScoped } from '../../state/app-state'

export interface AccessLogSheetProps {
  log: AccessLog | null
  onOpenChange: (open: boolean) => void
}

export function AccessLogSheet({ log, onOpenChange }: AccessLogSheetProps) {
  const { state, usersById, tenantsById, applicationsById } = useScoped()
  const user = log ? usersById.get(log.userId) : undefined
  const related = log ? state.auditLogs.filter((a) => a.requestId === log.requestId) : []
  const now = Date.now()

  return (
    <Sheet open={log !== null} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {log ? (
          <>
            <div className="bg-ink text-on-ink relative overflow-hidden p-6">
              <div className="bg-accent/30 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
              <div className="relative pr-8">
                <Kicker className="text-on-ink-muted">Access decision</Kicker>
                <SheetTitle className="mt-1 text-2xl font-bold tracking-tight">
                  {log.decision === 'allow' ? 'Allowed' : 'Denied'}
                </SheetTitle>
                <SheetDescription className="text-on-ink-muted mt-1 text-sm">
                  {ACCESS_REASON_LABEL[log.reason]}
                  {log.warning ? ` · warning: ${ACCESS_REASON_LABEL[log.warning]}` : ''}
                </SheetDescription>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <DecisionBadge decision={log.decision} />
                  <Badge className="border border-white/10 bg-white/10 text-white">
                    {log.reason}
                  </Badge>
                  <span className="text-on-ink-muted text-xs">{fmtAgo(log.at, now)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <KeyValue
                dense
                rows={[
                  { label: 'Request id', value: <Mono>{log.requestId}</Mono> },
                  { label: 'Time', value: fmtDateTime(log.at) },
                  {
                    label: 'User',
                    value: user ? `${user.name} · ${user.email}` : <Mono>{log.userId}</Mono>,
                  },
                  {
                    label: 'Organization',
                    value: tenantsById.get(log.tenantId)?.name ?? <Mono>{log.tenantId}</Mono>,
                  },
                  {
                    label: 'Application',
                    value: applicationsById.get(log.applicationId)?.name ?? (
                      <Mono>{log.applicationId}</Mono>
                    ),
                  },
                  {
                    label: 'Subscription',
                    value: log.subscriptionId ? <Mono>{log.subscriptionId}</Mono> : 'None',
                  },
                  { label: 'Decision', value: <DecisionBadge decision={log.decision} /> },
                  {
                    label: 'Reason',
                    value: (
                      <span>
                        {ACCESS_REASON_LABEL[log.reason]} <Mono>{log.reason}</Mono>
                      </span>
                    ),
                  },
                  {
                    label: 'Warning',
                    value: log.warning ? (
                      <span>
                        {ACCESS_REASON_LABEL[log.warning]} <Mono>{log.warning}</Mono>
                      </span>
                    ) : (
                      'None'
                    ),
                  },
                  { label: 'Latency', value: fmtMs(log.latencyMs) },
                ]}
              />
              <div>
                <p className="text-muted mb-2 text-[11px] font-semibold tracking-wider uppercase">
                  Related audit entries
                </p>
                {related.length === 0 ? (
                  <EmptyState
                    title="No audit entries"
                    description="Seeded decisions carry no audit trail. Run a real exchange from Access policies to see one."
                    className="py-6"
                  />
                ) : (
                  <ul className="space-y-2">
                    {related.map((a) => (
                      <li
                        key={a.id}
                        className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">
                            {AUDIT_ACTION_LABEL[a.action]}
                          </span>
                          <span className="text-muted block truncate text-xs">
                            {a.actorName} · {a.resourceType} <Mono>{a.resourceId}</Mono>
                          </span>
                        </span>
                        <span className="text-muted text-xs">{fmtAgo(a.at, now)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
