import { generateSecret, newId } from '@scp/fixtures'
import type { ApiClient, Environment } from '@scp/types'
import { ENVIRONMENTS, ENVIRONMENT_LABEL } from '@scp/types'
import {
  Banner,
  Button,
  Checkbox,
  CodeBlock,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Textarea,
} from '@scp/ui'
import { KeyRound } from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { applicationOptions, labelOptions } from '../../lib/options'
import { actorOf, useScoped } from '../../state/app-state'

const SCOPES = ['access:exchange', 'subscriptions:read', 'usage:report', 'webhooks:manage']

export type ApiClientDialogMode =
  { kind: 'create'; applicationId?: string } | { kind: 'rotate'; client: ApiClient }

export interface ApiClientDialogProps {
  /** null = closed. */
  mode: ApiClientDialogMode | null
  onOpenChange: (open: boolean) => void
}

/** Create or rotate an API client. The secret is shown exactly once (blueprint §22). */
export function ApiClientDialog({ mode, onOpenChange }: ApiClientDialogProps) {
  const { applications, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const [applicationId, setApplicationId] = React.useState('')
  const [environment, setEnvironment] = React.useState<Environment>('production')
  const [name, setName] = React.useState('')
  const [redirects, setRedirects] = React.useState('')
  const [scopes, setScopes] = React.useState<string[]>(SCOPES.slice(0, 3))
  const [revealed, setRevealed] = React.useState<{ clientId: string; secret: string } | null>(null)

  React.useEffect(() => {
    if (!mode) return
    setRevealed(null)
    if (mode.kind === 'create') {
      const app = mode.applicationId ? applicationsById.get(mode.applicationId) : undefined
      setApplicationId(mode.applicationId ?? '')
      setEnvironment('production')
      setName(app ? `${app.name} Production` : '')
      setRedirects(app?.callbackUrl ?? '')
      setScopes(SCOPES.slice(0, 3))
    }
  }, [mode, applicationsById])

  const app = applicationsById.get(applicationId)

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!app) return
    const secret = generateSecret()
    const client: ApiClient = {
      id: newId('cli'),
      applicationId: app.id,
      environment,
      name: name.trim() || `${app.name} ${ENVIRONMENT_LABEL[environment]}`,
      clientId: `${app.code.replace(/-/g, '_')}_${environment.slice(0, 4)}_${newId('').slice(1, 5)}`,
      secretHint: secret.slice(-4),
      status: 'active',
      allowedRedirectUris: redirects
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      allowedScopes: scopes,
      createdAt: new Date().toISOString(),
      rotatedAt: null,
    }
    dispatch({ type: 'apiClients/create', client, actor: actorOf(user) })
    setRevealed({ clientId: client.clientId, secret })
  }

  function rotate() {
    if (!mode || mode.kind !== 'rotate') return
    const secret = generateSecret()
    dispatch({
      type: 'apiClients/rotate',
      id: mode.client.id,
      secretHint: secret.slice(-4),
      actor: actorOf(user),
    })
    setRevealed({ clientId: mode.client.clientId, secret })
  }

  const title = revealed
    ? 'Save your client secret'
    : mode?.kind === 'rotate'
      ? 'Rotate client secret'
      : 'New API client'

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {revealed
              ? 'This is the only time the secret is shown. Store it in your application environment now.'
              : mode?.kind === 'rotate'
                ? `The current secret for ${mode.client.name} stops working immediately after rotation.`
                : 'Each environment gets its own client ID and secret. Secrets are stored hashed.'}
          </DialogDescription>
        </DialogHeader>

        {revealed ? (
          <div className="space-y-4">
            <Banner
              tone="warning"
              icon={<KeyRound />}
              title="Shown once."
              description="If you lose it, rotate the client to get a new secret."
            />
            <CodeBlock title="Client ID" code={revealed.clientId} tone="light" />
            <CodeBlock title="Client secret" code={revealed.secret} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>I have saved it</Button>
            </DialogFooter>
          </div>
        ) : mode?.kind === 'rotate' ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={rotate}>
              Rotate secret
            </Button>
          </DialogFooter>
        ) : (
          <form onSubmit={submitCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Application">
                <Combobox
                  value={applicationId}
                  onChange={setApplicationId}
                  options={applicationOptions(applications)}
                  placeholder="Select application"
                  searchPlaceholder="Search applications"
                  disabled={Boolean(mode?.kind === 'create' && mode.applicationId)}
                />
              </FormField>
              <FormField label="Environment">
                <Combobox
                  value={environment}
                  onChange={(v) => setEnvironment(v as Environment)}
                  options={labelOptions(ENVIRONMENTS, ENVIRONMENT_LABEL)}
                />
              </FormField>
              <FormField label="Client name" className="sm:col-span-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="IoT Demo Production"
                />
              </FormField>
              <FormField
                label="Allowed redirect URIs"
                hint="One per line. Only these callbacks may receive an authorization code."
                className="sm:col-span-2"
              >
                <Textarea
                  value={redirects}
                  onChange={(e) => setRedirects(e.target.value)}
                  className="min-h-20 font-mono text-xs"
                  placeholder="http://localhost:4101/auth/callback"
                />
              </FormField>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Allowed scopes</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SCOPES.map((s) => (
                    <label
                      key={s}
                      className="bg-surface flex items-center gap-3 rounded-2xl px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={scopes.includes(s)}
                        onChange={(e) =>
                          setScopes((cur) =>
                            e.target.checked ? [...cur, s] : cur.filter((x) => x !== s),
                          )
                        }
                      />
                      <code className="font-mono text-xs">{s}</code>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!app}>
                Create client
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
