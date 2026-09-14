import { fmtDate } from '@scp/fixtures'
import type { ApiClient, Application } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
} from '@scp/ui'
import { Ban, KeyRound, MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { EnvBadge, Mono } from '../../components/badges'
import { ApiClientDialog, type ApiClientDialogMode } from '../../components/master/ApiClientDialog'
import { actorOf, useScoped } from '../../state/app-state'

export function ApiClientsCard({ app }: { app: Application }) {
  const { clientsByApplication, dispatch } = useScoped()
  const user = useCurrentUser()
  const [mode, setMode] = React.useState<ApiClientDialogMode | null>(null)
  const [revoking, setRevoking] = React.useState<ApiClient | null>(null)
  const clients = clientsByApplication.get(app.id) ?? []

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          API clients <Badge variant="muted">{clients.length}</Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode({ kind: 'create', applicationId: app.id })}
        >
          <Plus /> New client
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {clients.length === 0 ? (
          <EmptyState
            icon={<KeyRound />}
            title="No API clients"
            description="Each environment needs its own client ID and secret."
            action={
              <Button size="sm" onClick={() => setMode({ kind: 'create', applicationId: app.id })}>
                <Plus /> New client
              </Button>
            }
          />
        ) : (
          clients.map((c) => (
            <div
              key={c.id}
              className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <EnvBadge environment={c.environment} />
                  {c.status === 'revoked' ? <Badge variant="muted">Revoked</Badge> : null}
                </div>
                <p className="text-muted mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                  <Mono>{c.clientId}</Mono>
                  <span>
                    secret <Mono>••••{c.secretHint}</Mono>
                  </span>
                  <span>· created {fmtDate(c.createdAt)}</span>
                  {c.rotatedAt ? <span>· rotated {fmtDate(c.rotatedAt)}</span> : null}
                </p>
              </div>
              {c.status === 'active' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Client actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setMode({ kind: 'rotate', client: c })}>
                      <RefreshCw /> Rotate secret
                    </DropdownMenuItem>
                    <DropdownMenuItem danger onSelect={() => setRevoking(c)}>
                      <Ban /> Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
      <ApiClientDialog mode={mode} onOpenChange={(open) => !open && setMode(null)} />
      <ConfirmDelete
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke ${revoking?.name ?? 'client'}?`}
        description="Every token exchange with this client ID fails immediately. This cannot be undone."
        actionLabel="Revoke"
        onConfirm={() => {
          if (revoking)
            dispatch({ type: 'apiClients/revoke', id: revoking.id, actor: actorOf(user) })
          setRevoking(null)
        }}
      />
    </Card>
  )
}
