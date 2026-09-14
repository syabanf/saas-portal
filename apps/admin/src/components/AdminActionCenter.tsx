import { invitationFields } from '@scp/fixtures'
import { Badge, Button, Sheet, SheetContent, SheetDescription, SheetTitle } from '@scp/ui'
import { AlertTriangle, Bell, CreditCard, Link2, PlugZap, UserRoundX } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../auth/auth'
import { actorOf, useScoped } from '../state/app-state'

export function AdminActionCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, subscriptions, applications, tenantsById, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const now = Date.now()
  const items = [
    ...subscriptions.filter((sub) => ['past_due', 'grace_period', 'suspended'].includes(sub.status)).map((sub) => ({ key: `sub-${sub.id}`, title: `${tenantsById.get(sub.tenantId)?.name ?? 'Organization'} needs billing attention`, description: `${applicationsById.get(sub.applicationId)?.name ?? 'Application'} · ${sub.status.replaceAll('_', ' ')}`, to: `/subscriptions/${sub.id}`, label: 'Review subscription', tone: 'danger' as const, icon: CreditCard, onAction: undefined as (() => void) | undefined })),
    ...state.deliveries.filter((delivery) => delivery.status === 'failed' || delivery.status === 'retrying').map((delivery) => ({ key: `delivery-${delivery.id}`, title: 'Webhook delivery failed', description: `${delivery.event} · HTTP ${delivery.httpStatus ?? 'error'}`, to: `/webhooks/${delivery.endpointId}`, label: 'Retry now', tone: 'warning' as const, icon: Link2, onAction: () => dispatch({ type: 'webhooks/retry', deliveryId: delivery.id, actor: actorOf(user) }) })),
    ...applications.filter((app) => app.health !== 'healthy').map((app) => ({ key: `app-${app.id}`, title: `${app.name} is ${app.health}`, description: app.lastFailure ?? 'Integration health check needs review.', to: '/health', label: 'Open health center', tone: 'warning' as const, icon: PlugZap, onAction: undefined as (() => void) | undefined })),
    ...state.members.filter((member) => member.status === 'invited' && member.invitationExpiresAt && Date.parse(member.invitationExpiresAt) <= now).map((member) => ({ key: `invite-${member.id}`, title: 'Invitation expired', description: `${tenantsById.get(member.tenantId)?.name ?? 'Organization'} · renewal needed`, to: `/organizations/${member.tenantId}`, label: 'Renew now', tone: 'warning' as const, icon: UserRoundX, onAction: () => dispatch({ type: 'members/upsert', member: { ...member, ...invitationFields() } }) })),
  ].slice(0, 20)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-5">
        <div className="flex items-center gap-3"><span className="bg-accent-soft text-accent flex size-10 items-center justify-center rounded-full"><Bell className="size-4" /></span><div><SheetTitle className="text-xl font-bold">Needs attention</SheetTitle><SheetDescription className="text-muted text-sm">Actions that may affect access, billing or integrations.</SheetDescription></div></div>
        <div className="mt-6 space-y-3">
          {items.length ? items.map((item) => (
            <article key={item.key} className="border-border rounded-2xl border p-4">
              <div className="flex items-start gap-3"><item.icon className="text-accent mt-0.5 size-5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant={item.tone}>{item.tone === 'danger' ? 'Urgent' : 'Review'}</Badge></div><p className="text-muted mt-1 text-xs">{item.description}</p><Button size="sm" variant="outline" className="mt-3" onClick={() => { if (item.onAction) item.onAction(); else navigate(item.to); onOpenChange(false) }}>{item.label}</Button></div></div>
            </article>
          )) : <div className="py-16 text-center"><AlertTriangle className="text-success mx-auto size-8" /><p className="mt-3 font-semibold">All clear</p><p className="text-muted mt-1 text-sm">No billing, access or integration issues need action.</p></div>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
