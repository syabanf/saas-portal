import { fmtDate } from '@scp/fixtures'
import type { WebhookEndpoint } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  EmptyState,
  KeyValue,
} from '@scp/ui'
import { Pencil, Send, ShieldCheck, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono } from '../../components/badges'
import { WebhookDialog } from '../../components/master/WebhookDialog'
import { actorOf, useScoped } from '../../state/app-state'
import { DeliveryTable } from './DeliveryTable'

export function WebhookDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { webhooksById, applicationsById, deliveriesByEndpoint, dispatch } = useScoped()
  const user = useCurrentUser()
  const endpoint = webhooksById.get(id)
  const [editing, setEditing] = React.useState<WebhookEndpoint | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  if (!endpoint) {
    return (
      <EmptyState
        title="Endpoint not found"
        description="It may have been deleted. Go back to the list to pick another one."
        action={
          <Button variant="outline" asChild>
            <Link to="/webhooks">All webhooks</Link>
          </Button>
        }
      />
    )
  }

  const app = applicationsById.get(endpoint.applicationId)
  const deliveries = deliveriesByEndpoint.get(endpoint.id) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="block font-mono text-lg font-bold break-all">{endpoint.url}</code>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-muted text-sm">{app?.name ?? 'Unknown application'}</span>
            <Badge variant={endpoint.status === 'active' ? 'success' : 'muted'} dot>
              {endpoint.status === 'active' ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              dispatch({ type: 'webhooks/test', endpointId: endpoint.id, actor: actorOf(user) })
            }
          >
            <Send />
            Test
          </Button>
          <Button variant="outline" onClick={() => setEditing(endpoint)}>
            <Pencil />
            Edit
          </Button>
          <Button variant="outline" className="text-accent" onClick={() => setDeleting(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValue
                dense
                rows={[
                  {
                    label: 'Application',
                    value: app?.name ?? <Mono>{endpoint.applicationId}</Mono>,
                  },
                  { label: 'Signing secret', value: <Mono>{`••••${endpoint.secretHint}`}</Mono> },
                  { label: 'Created', value: fmtDate(endpoint.createdAt) },
                  {
                    label: 'Events',
                    value: (
                      <div className="flex flex-wrap gap-1.5">
                        {endpoint.events.map((ev) => (
                          <span key={ev} className="bg-surface rounded-full px-2 py-0.5">
                            <Mono className="text-[11px]">{ev}</Mono>
                          </span>
                        ))}
                      </div>
                    ),
                  },
                  { label: 'Status', value: endpoint.status === 'active' ? 'Active' : 'Paused' },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="text-muted size-4" />
                Signature
              </CardTitle>
              <CardDescription>Verify every delivery before you trust its payload.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <Mono>X-Signature</Mono> carries an HMAC-SHA256 of <Mono>timestamp.body</Mono> using
                the signing secret.
              </p>
              <p>
                <Mono>X-Timestamp</Mono> is the send time in Unix seconds. Reject deliveries older
                than the 5 min replay window.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
            <CardDescription>{deliveries.length} recorded for this endpoint.</CardDescription>
          </CardHeader>
          <DeliveryTable
            rows={deliveries}
            showApplication={false}
            empty={{
              title: 'No deliveries yet',
              description: 'Send a test event to check the endpoint responds with 2xx.',
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch({
                      type: 'webhooks/test',
                      endpointId: endpoint.id,
                      actor: actorOf(user),
                    })
                  }
                >
                  Send test
                </Button>
              ),
            }}
          />
        </Card>
      </div>

      <WebhookDialog endpoint={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete endpoint?"
        description="The endpoint stops receiving events and its delivery history is removed."
        onConfirm={() => {
          dispatch({ type: 'webhooks/remove', id: endpoint.id })
          navigate('/webhooks')
        }}
      />
    </div>
  )
}
