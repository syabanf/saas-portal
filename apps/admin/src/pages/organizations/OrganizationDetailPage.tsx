import { fmtDate, fmtDateTime, fmtIdr } from '@scp/fixtures'
import type { EventType, Tenant } from '@scp/types'
import { BILLING_PERIOD_LABEL, TENANT_STATUS_LABEL } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDelete,
  EmptyState,
  KeyValue,
  Timeline,
  type TimelineItem,
} from '@scp/ui'
import { Ban, CheckCircle2, FileText, Pencil, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { InvoiceBadge, Mono, TenantBadge } from '../../components/badges'
import { TenantDialog, countryLabel } from '../../components/master/TenantDialog'
import { actorOf, useScoped } from '../../state/app-state'
import { ApplicationAccessCard } from './ApplicationAccessCard'
import { MembersCard } from './MembersCard'
import { SubscriptionsCard } from './SubscriptionsCard'

const EVENT_TONE: Partial<Record<EventType, TimelineItem['tone']>> = {
  'subscription.activated': 'success',
  'subscription.renewed': 'success',
  'payment.success': 'success',
  'subscription.past_due': 'warning',
  'subscription.grace_started': 'warning',
  'subscription.suspended': 'accent',
  'subscription.expired': 'accent',
  'subscription.created': 'default',
}

export function OrganizationDetailPage() {
  const { id = '' } = useParams()
  const {
    tenantsById,
    subscriptionsByTenant,
    invoicesByTenant,
    eventsBySubscription,
    applicationsById,
    dispatch,
  } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const tenant = tenantsById.get(id)
  const [editing, setEditing] = React.useState<Tenant | null>(null)
  const [confirmSuspend, setConfirmSuspend] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)

  const invoices = React.useMemo(
    () =>
      (invoicesByTenant.get(id) ?? [])
        .slice()
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
        .slice(0, 5),
    [invoicesByTenant, id],
  )
  const subs = subscriptionsByTenant.get(id) ?? []

  if (!tenant) {
    return (
      <EmptyState
        title="Organization not found"
        description="It may have been deleted."
        action={
          <Button variant="outline" asChild>
            <Link to="/organizations">All organizations</Link>
          </Button>
        }
      />
    )
  }

  const actor = actorOf(user)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <TenantBadge status={tenant.status} />
          </div>
          <p className="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Mono>{tenant.code}</Mono>
            <span>· {countryLabel(tenant.country)}</span>
            <span>· created {fmtDate(tenant.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(tenant)}>
            <Pencil /> Edit
          </Button>
          {tenant.status === 'suspended' ? (
            <Button
              variant="outline"
              onClick={() =>
                dispatch({ type: 'tenants/setStatus', id: tenant.id, status: 'active', actor })
              }
            >
              <CheckCircle2 /> Reactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmSuspend(true)}>
              <Ban /> Suspend
            </Button>
          )}
          <Button variant="outline" className="text-accent" onClick={() => setRemoving(true)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <nav aria-label="Organization tasks" className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <a href="#members">Manage people</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="#access">Resolve app access</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="#subscriptions">Manage subscriptions</a>
        </Button>
        <Button variant="secondary" asChild>
          <Link to={`/billing?tenant=${tenant.id}`}>Review invoices</Link>
        </Button>
      </nav>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={[
                { label: 'ID', value: <Mono>{tenant.id}</Mono> },
                { label: 'Billing email', value: tenant.billingEmail },
                { label: 'Country', value: countryLabel(tenant.country) },
                { label: 'Status', value: TENANT_STATUS_LABEL[tenant.status] },
                { label: 'Created', value: fmtDateTime(tenant.createdAt) },
                { label: 'Updated', value: fmtDateTime(tenant.updatedAt) },
              ]}
            />
          </CardContent>
        </Card>

        <section id="subscriptions" className="scroll-mt-4">
          <SubscriptionsCard tenant={tenant} />
        </section>
        <section id="members" className="scroll-mt-4">
          <MembersCard tenant={tenant} />
        </section>
        <section id="access" className="scroll-mt-4">
          <ApplicationAccessCard tenant={tenant} />
        </section>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Invoices</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/billing?tenant=${tenant.id}`}>View billing</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No invoices yet"
                description="Invoices appear once a paid subscription starts or renews."
              />
            ) : (
              invoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/billing/${inv.id}`}
                  className="bg-surface-2 hover:bg-card hover:shadow-card flex flex-wrap items-center gap-3 rounded-2xl p-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <Mono className="text-foreground font-semibold">{inv.number}</Mono>
                    <p className="text-muted text-xs">Due {fmtDate(inv.dueDate)}</p>
                  </div>
                  <InvoiceBadge status={inv.status} />
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtIdr(inv.total, inv.currency)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subscription timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {subs.length === 0 ? (
              <EmptyState
                title="Nothing to show yet"
                description="Every subscription change lands here for support, finance and audit."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {subs.map((s) => {
                  const events = (eventsBySubscription.get(s.id) ?? [])
                    .slice()
                    .sort(
                      (a, b) =>
                        a.at.localeCompare(b.at) ||
                        (a.type === 'subscription.created'
                          ? -1
                          : b.type === 'subscription.created'
                            ? 1
                            : 0),
                    )
                  return (
                    <div key={s.id} className="min-w-0">
                      <p className="mb-3 text-sm font-semibold">
                        {applicationsById.get(s.applicationId)?.name ?? 'Application'}{' '}
                        <span className="text-muted font-normal">
                          · {BILLING_PERIOD_LABEL[s.billingPeriod]}
                        </span>
                      </p>
                      {events.length === 0 ? (
                        <p className="text-muted text-sm">No events recorded.</p>
                      ) : (
                        <Timeline
                          items={events.map((e) => ({
                            id: e.id,
                            when: fmtDate(e.at),
                            title: e.label,
                            note: e.note,
                            tone: EVENT_TONE[e.type] ?? 'default',
                          }))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TenantDialog tenant={editing} onOpenChange={(open) => !open && setEditing(null)} />

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {tenant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every user of this organization loses access to every application immediately.
              Subscriptions and data stay in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dispatch({ type: 'tenants/setStatus', id: tenant.id, status: 'suspended', actor })
              }
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDelete
        open={removing}
        onOpenChange={setRemoving}
        title={`Delete ${tenant.name}?`}
        description="Its subscriptions, members and invoices are removed as well. Users keep their accounts."
        onConfirm={() => {
          dispatch({ type: 'tenants/remove', id: tenant.id, actor })
          navigate('/organizations')
        }}
      />
    </div>
  )
}
