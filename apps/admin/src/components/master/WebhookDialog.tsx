import { generateSecret, newId } from '@scp/fixtures'
import type { EventType, WebhookEndpoint } from '@scp/types'
import { EVENT_TYPES } from '@scp/types'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  ToggleRow,
} from '@scp/ui'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'

const DEFAULT_EVENTS: EventType[] = [
  'subscription.activated',
  'subscription.updated',
  'subscription.suspended',
  'subscription.expired',
]

export function emptyWebhook(applicationId = ''): WebhookEndpoint {
  return {
    id: '',
    applicationId,
    url: '',
    events: DEFAULT_EVENTS,
    status: 'active',
    secretHint: '',
    createdAt: new Date().toISOString(),
  }
}

const GROUPS = Array.from(new Set(EVENT_TYPES.map((e) => e.split('.')[0]!)))

export interface WebhookDialogProps {
  endpoint: WebhookEndpoint | null
  applicationId?: string
  onOpenChange: (open: boolean) => void
}

export function WebhookDialog({ endpoint, applicationId, onOpenChange }: WebhookDialogProps) {
  const { applications, dispatch } = useScoped()
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState<WebhookEndpoint>(
    () => endpoint ?? emptyWebhook(applicationId),
  )
  React.useEffect(() => {
    if (endpoint) setDraft({ ...endpoint, applicationId: applicationId ?? endpoint.applicationId })
  }, [endpoint, applicationId])
  const isCreate = draft.id === ''

  function toggleEvent(ev: EventType, on: boolean) {
    setDraft((d) => ({
      ...d,
      events: on ? Array.from(new Set([...d.events, ev])) : d.events.filter((x) => x !== ev),
    }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.applicationId || !draft.url) return
    const next: WebhookEndpoint = isCreate
      ? {
          ...draft,
          id: newId('whk'),
          secretHint: generateSecret(4).toLowerCase(),
          createdAt: new Date().toISOString(),
        }
      : draft
    dispatch({ type: 'webhooks/upsert', endpoint: next, actor: actorOf(user) })
    onOpenChange(false)
  }

  return (
    <Dialog open={endpoint !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New webhook endpoint' : 'Edit webhook endpoint'}</DialogTitle>
            <DialogDescription>
              Deliveries are signed, timestamped and retried up to five times.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Application">
              <Select
                value={draft.applicationId}
                onChange={(e) => setDraft((d) => ({ ...d, applicationId: e.target.value }))}
                disabled={Boolean(applicationId) || !isCreate}
                required
              >
                <option value="">Select application</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Endpoint URL">
              <Input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                placeholder="https://iot.example.com/webhook"
                required
              />
            </FormField>
            <div className="sm:col-span-2">
              <ToggleRow
                title="Active"
                description="Paused endpoints keep their subscriptions but receive nothing."
                checked={draft.status === 'active'}
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, status: v ? 'active' : 'paused' }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Events</p>
              <div className="bg-surface grid gap-3 rounded-2xl p-3 sm:grid-cols-2">
                {GROUPS.map((g) => (
                  <div key={g}>
                    <p className="text-muted mb-1 text-[11px] font-semibold tracking-wider uppercase">
                      {g.replace('_', ' ')}
                    </p>
                    <div className="space-y-1">
                      {EVENT_TYPES.filter((e) => e.startsWith(`${g}.`)).map((ev) => (
                        <label key={ev} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={draft.events.includes(ev)}
                            onChange={(e) => toggleEvent(ev, e.target.checked)}
                          />
                          <code className="font-mono">{ev}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isCreate ? 'Create endpoint' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
