import { fmtAgo, fmtIdr } from '@scp/fixtures'
import type { Application } from '@scp/types'
import {
  ACCESS_POLICY_LABEL,
  ACCESS_REASON_LABEL,
  APPLICATION_STATUS_LABEL,
  APPLICATION_TYPE_LABEL,
  AUTH_MODE_LABEL,
} from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  EmptyState,
  IconTile,
  KeyValue,
} from '@scp/ui'
import { Activity, Ban, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import {
  AppTypeIcon,
  DecisionBadge,
  HealthBadge,
  Mono,
  SubscriptionBadge,
} from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'
import { ApiClientsCard } from './ApiClientsCard'
import { IntegrationHealthCard } from './IntegrationHealthCard'
import { SubscriptionsCard } from './SubscriptionsCard'
import { WebhooksCard } from './WebhooksCard'

export function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const { state, applicationsById, usersById, tenantsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const app = applicationsById.get(id)
  const [confirmDisable, setConfirmDisable] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const now = Date.now()

  const recentAccess = React.useMemo(
    () => state.accessLogs.filter((l) => l.applicationId === id).slice(0, 8),
    [state.accessLogs, id],
  )

  if (!app) {
    return (
      <EmptyState
        title="Product not found"
        description="It may have been deleted."
        action={
          <Button variant="outline" asChild>
            <Link to="/applications">All products</Link>
          </Button>
        }
      />
    )
  }

  const actor = actorOf(user)
  const paid = app.accessPolicy === 'subscription'

  function setStatus(status: Application['status']) {
    if (!app) return
    dispatch({
      type: 'applications/upsert',
      application: { ...app, status, updatedAt: new Date(now).toISOString() },
      actor,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone="ink" size="lg">
            <AppTypeIcon type={app.type} />
          </IconTile>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
              <HealthBadge health={app.health} />
              <Badge variant={app.status === 'active' ? 'success' : 'muted'}>
                {APPLICATION_STATUS_LABEL[app.status]}
              </Badge>
            </div>
            <p className="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Mono>{app.code}</Mono>
              <span>· {APPLICATION_TYPE_LABEL[app.type]}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={`/applications/${app.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          {app.status === 'active' ? (
            <Button variant="outline" onClick={() => setConfirmDisable(true)}>
              <Ban /> Disable
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStatus('active')}>
              <CheckCircle2 /> Enable
            </Button>
          )}
          <Button variant="outline" className="text-accent" onClick={() => setRemoving(true)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  { label: 'Type', value: APPLICATION_TYPE_LABEL[app.type] },
                  { label: 'URL', value: <Mono>{app.baseUrl}</Mono> },
                  { label: 'Authentication', value: AUTH_MODE_LABEL[app.authMode] },
                  { label: 'Access policy', value: ACCESS_POLICY_LABEL[app.accessPolicy] },
                  {
                    label: 'Monthly price',
                    value: paid ? (
                      <span className="tabular-nums">{fmtIdr(app.priceMonthly, app.currency)}</span>
                    ) : (
                      <span className="text-muted">Not billed</span>
                    ),
                  },
                  {
                    label: 'Annual price',
                    value: paid ? (
                      <span className="tabular-nums">{fmtIdr(app.priceAnnual, app.currency)}</span>
                    ) : (
                      <span className="text-muted">Not billed</span>
                    ),
                  },
                  {
                    label: 'Trial days',
                    value: paid && app.trialDays > 0 ? `${app.trialDays} days` : 'No trial',
                  },
                  {
                    label: 'Allowed statuses',
                    value: (
                      <span className="flex flex-wrap gap-1">
                        {app.allowedStatuses.length === 0 ? (
                          <span className="text-muted">None</span>
                        ) : (
                          app.allowedStatuses.map((s) => (
                            <SubscriptionBadge key={s} status={s} dot={false} />
                          ))
                        )}
                      </span>
                    ),
                  },
                  { label: 'Audience', value: <Mono>{app.audience}</Mono> },
                  { label: 'Issuer', value: <Mono>{app.issuer}</Mono> },
                  { label: 'Callback', value: <Mono>{app.callbackUrl}</Mono> },
                  { label: 'Token lifetime', value: `${app.tokenLifetimeMinutes} minutes` },
                ]}
              />
            </CardContent>
          </Card>

          <SubscriptionsCard app={app} />
          <ApiClientsCard app={app} />
          <WebhooksCard app={app} />

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle>Recent access</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/logs?app=${app.id}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAccess.length === 0 ? (
                <EmptyState
                  icon={<Activity />}
                  title="No access requests yet"
                  description="Decisions appear here as users open this product."
                />
              ) : (
                recentAccess.map((l) => (
                  <div
                    key={l.id}
                    className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {usersById.get(l.userId)?.name ?? l.userId}
                      </p>
                      <p className="text-muted truncate text-xs">
                        {tenantsById.get(l.tenantId)?.name ?? l.tenantId} ·{' '}
                        {ACCESS_REASON_LABEL[l.reason]}
                      </p>
                    </div>
                    <DecisionBadge decision={l.decision} />
                    <span className="text-muted text-xs">{fmtAgo(l.at, now)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <IntegrationHealthCard
            app={app}
            onEdit={() => navigate(`/applications/${app.id}/edit`)}
            onDelete={() => setRemoving(true)}
          />
        </div>
      </div>

      <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {app.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every access request is denied until the product is enabled again. Clients and
              webhooks stay configured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStatus('disabled')}>Disable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDelete
        open={removing}
        onOpenChange={setRemoving}
        title={`Delete ${app.name}?`}
        description="Its API clients, webhooks, deliveries and subscriptions are removed, and it disappears from every member assignment."
        onConfirm={() => {
          dispatch({ type: 'applications/remove', id: app.id })
          navigate('/applications')
        }}
      />
    </div>
  )
}
