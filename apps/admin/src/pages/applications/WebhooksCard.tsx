import { fmtAgo } from '@scp/fixtures'
import type { Application, WebhookEndpoint } from '@scp/types'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@scp/ui'
import { Plus, Send, Webhook } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { DeliveryBadge, Mono } from '../../components/badges'
import { WebhookDialog, emptyWebhook } from '../../components/master/WebhookDialog'
import { actorOf, useScoped } from '../../state/app-state'

export function WebhooksCard({ app }: { app: Application }) {
  const { webhooksByApplication, deliveriesByEndpoint, dispatch } = useScoped()
  const user = useCurrentUser()
  const [editing, setEditing] = React.useState<WebhookEndpoint | null>(null)
  const endpoints = webhooksByApplication.get(app.id) ?? []
  const now = Date.now()

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          Webhooks <Badge variant="muted">{endpoints.length}</Badge>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(emptyWebhook(app.id))}>
          <Plus /> Add endpoint
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {endpoints.length === 0 ? (
          <EmptyState
            icon={<Webhook />}
            title="No webhook endpoints"
            description="Subscription and payment changes are pushed to your application in real time."
            action={
              <Button size="sm" onClick={() => setEditing(emptyWebhook(app.id))}>
                <Plus /> Add endpoint
              </Button>
            }
          />
        ) : (
          endpoints.map((w) => {
            const deliveries = (deliveriesByEndpoint.get(w.id) ?? [])
              .slice()
              .sort((a, b) => b.at.localeCompare(a.at))
              .slice(0, 3)
            return (
              <div key={w.id} className="bg-surface-2 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Mono className="text-foreground block truncate font-semibold">{w.url}</Mono>
                    <p className="text-muted text-xs">
                      {w.events.length} events ·{' '}
                      <Badge variant={w.status === 'active' ? 'success' : 'muted'}>
                        {w.status === 'active' ? 'Active' : 'Paused'}
                      </Badge>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        dispatch({ type: 'webhooks/test', endpointId: w.id, actor: actorOf(user) })
                      }
                    >
                      <Send /> Test
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(w)}>
                      Edit
                    </Button>
                    <Button variant="link" size="sm" asChild>
                      <Link to={`/webhooks/${w.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
                {deliveries.length > 0 ? (
                  <ul className="border-border mt-2 space-y-1 border-t pt-2">
                    {deliveries.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <DeliveryBadge status={d.status} />
                        <Mono className="min-w-0 flex-1 truncate">{d.event}</Mono>
                        <span className="text-muted">
                          {d.httpStatus ?? '—'} · {fmtAgo(d.at, now)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })
        )}
      </CardContent>
      <WebhookDialog
        endpoint={editing}
        applicationId={app.id}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </Card>
  )
}
