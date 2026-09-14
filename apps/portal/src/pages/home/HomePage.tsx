import { fmtAgo } from '@scp/fixtures'
import { ACCESS_REASON_LABEL } from '@scp/types'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@scp/ui'
import { Activity } from 'lucide-react'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { AppCard } from '../../components/AppCard'
import { DecisionBadge } from '../../components/badges'
import { OutstandingBanner } from '../../components/OutstandingBanner'
import { OnboardingChecklist } from '../../components/OnboardingChecklist'
import { useScoped } from '../../state/app-state'

function greeting(hour: number): string {
  if (hour < 11) return 'Good morning'
  if (hour < 16) return 'Good afternoon'
  return 'Good evening'
}

/** Application launcher (blueprint §32, §43, §44). */
export function HomePage() {
  const user = useCurrentUser()
  const { state, tenant, tenantId, applications, usersById, applicationsById } = useScoped()
  const { member } = useAuth()
  const isAdmin = member?.workspaceRole === 'workspace_admin'
  const now = Date.now()
  const recent = state.accessLogs
    .filter((l) => l.tenantId === tenantId && (isAdmin || l.userId === user.id))
    .slice(0, 5)
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted text-sm">
          {greeting(new Date(now).getHours())} · {tenant?.name ?? 'your organization'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {firstName}
          <span className="text-accent">.</span>
        </h1>
      </div>

      <OutstandingBanner />
      <OnboardingChecklist />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Your applications</h2>
        {applications.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Activity />}
              title="No applications yet"
              description="Applications appear here as soon as the platform publishes them."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {applications.map((item) => (
              <AppCard key={item.app.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? 'Organization activity' : 'Your recent activity'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <EmptyState
              icon={<Activity />}
              title="No activity yet"
              description={
                isAdmin
                  ? 'Application access activity across your organization appears here.'
                  : 'Your application access activity appears here.'
              }
            />
          ) : (
            recent.map((l) => (
              <div
                key={l.id}
                className="bg-surface-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl p-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{usersById.get(l.userId)?.name ?? l.userId}</span>
                  <span className="text-muted">
                    {' '}
                    → {applicationsById.get(l.applicationId)?.name ?? l.applicationId}
                  </span>
                </span>
                <DecisionBadge decision={l.decision} />
                <span className="text-muted text-xs">{ACCESS_REASON_LABEL[l.reason]}</span>
                <span className="text-muted text-xs">{fmtAgo(l.at, now)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
