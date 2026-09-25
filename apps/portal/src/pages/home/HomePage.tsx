import { useFormat, useT } from '@scp/i18n'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@scp/ui'
import { Activity } from 'lucide-react'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { AppCard } from '../../components/AppCard'
import { DecisionBadge } from '../../components/badges'
import { OutstandingBanner } from '../../components/OutstandingBanner'
import { OnboardingChecklist } from '../../components/OnboardingChecklist'
import { useScoped } from '../../state/app-state'

function greetingKey(hour: number) {
  if (hour < 11) return 'home.goodMorning' as const
  if (hour < 16) return 'home.goodAfternoon' as const
  return 'home.goodEvening' as const
}

/** Application launcher (blueprint §32, §43, §44). */
export function HomePage() {
  const t = useT()
  const { formatAgo } = useFormat()
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
          {t(greetingKey(new Date(now).getHours()))} ·{' '}
          {tenant?.name ?? t('common.yourOrganization')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('home.welcome', { name: firstName })}
          <span className="text-accent">.</span>
        </h1>
      </div>

      <OutstandingBanner />
      <OnboardingChecklist />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t('home.yourApplications')}</h2>
        {applications.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Activity />}
              title={t('home.noApplications')}
              description={t('home.noApplicationsDescription')}
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
          <CardTitle>{isAdmin ? t('home.organizationActivity') : t('home.yourActivity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <EmptyState
              icon={<Activity />}
              title={t('home.noActivity')}
              description={isAdmin ? t('home.noActivityOrganization') : t('home.noActivityYou')}
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
                <span className="text-muted text-xs">{t(`reason.${l.reason}`)}</span>
                <span className="text-muted text-xs">{formatAgo(l.at, now)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
