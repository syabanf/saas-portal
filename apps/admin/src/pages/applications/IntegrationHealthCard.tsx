import { fmtAgo, integrationModeOf } from '@scp/fixtures'
import type { Application } from '@scp/types'
import { ACCESS_POLICY_LABEL, INTEGRATION_MODE_LABEL } from '@scp/types'
import { Button, Card, CardContent, CardHeader, SectionTitle, SettingRow } from '@scp/ui'
import {
  BookOpen,
  ChevronRight,
  KeyRound,
  Layers,
  RefreshCw,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { HealthDot } from '../../components/badges'
import { actorOf, useScoped } from '../../state/app-state'

export interface IntegrationHealthCardProps {
  app: Application
  onEdit: () => void
  onDelete: () => void
}

/** Right inspector column: health readout, retry, and the setting rows that open the edit wizard (blueprint §46). */
export function IntegrationHealthCard({ app, onEdit, onDelete }: IntegrationHealthCardProps) {
  const { webhooksByApplication, deliveriesByEndpoint, clientsByApplication, dispatch } =
    useScoped()
  const user = useCurrentUser()
  const now = Date.now()

  const failedDelivery = React.useMemo(
    () =>
      (webhooksByApplication.get(app.id) ?? [])
        .flatMap((w) => deliveriesByEndpoint.get(w.id) ?? [])
        .filter((d) => d.status === 'failed' || d.status === 'retrying')
        .sort((a, b) => b.at.localeCompare(a.at))[0],
    [webhooksByApplication, deliveriesByEndpoint, app.id],
  )
  const activeClients = (clientsByApplication.get(app.id) ?? []).filter(
    (c) => c.status === 'active',
  ).length

  function retry() {
    const actor = actorOf(user)
    if (failedDelivery) {
      dispatch({ type: 'webhooks/retry', deliveryId: failedDelivery.id, actor })
      return
    }
    dispatch({
      type: 'applications/upsert',
      application: {
        ...app,
        health: 'healthy',
        lastFailure: null,
        lastSuccessAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
      actor,
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <SectionTitle>Integration health</SectionTitle>
        <HealthDot health={app.health} />
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-surface-2 rounded-2xl p-3">
            <dt className="text-muted text-xs">Last success</dt>
            <dd className="mt-0.5 font-semibold">{fmtAgo(app.lastSuccessAt, now)}</dd>
          </div>
          <div className="bg-surface-2 rounded-2xl p-3">
            <dt className="text-muted text-xs">Last failure</dt>
            <dd className="mt-0.5 truncate font-semibold" title={app.lastFailure ?? undefined}>
              {app.lastFailure ?? 'None'}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={retry} disabled={app.health === 'healthy' && !failedDelivery}>
            <RefreshCw /> Retry
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/logs?app=${app.id}`}>View logs</Link>
          </Button>
        </div>

        <div className="space-y-2">
          {[
            {
              icon: <KeyRound />,
              title: 'Authentication',
              subtitle: INTEGRATION_MODE_LABEL[integrationModeOf(app)],
            },
            {
              icon: <ShieldCheck />,
              title: 'Access policy',
              subtitle: ACCESS_POLICY_LABEL[app.accessPolicy],
            },
            {
              icon: <Timer />,
              title: 'Token lifetime',
              subtitle: `${app.tokenLifetimeMinutes} minutes`,
            },
            {
              icon: <Layers />,
              title: 'Environments',
              subtitle: `${activeClients} ${activeClients === 1 ? 'client' : 'clients'}`,
            },
          ].map((row) => (
            <SettingRow
              key={row.title}
              {...row}
              trailing={<ChevronRight className="text-muted size-4" />}
              onClick={onEdit}
            />
          ))}
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link to={`/sdk?app=${app.id}`}>
            <BookOpen /> Open SDK guide
          </Link>
        </Button>
        <button
          type="button"
          onClick={onDelete}
          className="text-accent block w-full text-center text-sm font-semibold hover:underline"
        >
          Delete product
        </button>
      </CardContent>
    </Card>
  )
}
