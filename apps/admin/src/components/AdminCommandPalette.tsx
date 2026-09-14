import { Badge, Input, Sheet, SheetContent, SheetDescription, SheetTitle } from '@scp/ui'
import { Building2, CreditCard, FileText, Search, Shapes, Users } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useScoped } from '../state/app-state'

export function AdminCommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { tenants, users, applications, subscriptions, invoices, tenantsById, applicationsById } = useScoped()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const q = query.trim().toLowerCase()
  const results = [
    ...tenants.map((item) => ({ key: item.id, label: item.name, meta: item.code, to: `/organizations/${item.id}`, icon: Building2, group: 'Organization' })),
    ...users.map((item) => ({ key: item.id, label: item.name, meta: item.email, to: `/users?q=${encodeURIComponent(item.email)}`, icon: Users, group: 'User' })),
    ...applications.map((item) => ({ key: item.id, label: item.name, meta: item.code, to: `/applications/${item.id}`, icon: Shapes, group: 'Application' })),
    ...subscriptions.map((item) => ({ key: item.id, label: `${tenantsById.get(item.tenantId)?.name ?? 'Organization'} · ${applicationsById.get(item.applicationId)?.name ?? 'Application'}`, meta: item.status.replaceAll('_', ' '), to: `/subscriptions/${item.id}`, icon: CreditCard, group: 'Subscription' })),
    ...invoices.map((item) => ({ key: item.id, label: item.number, meta: tenantsById.get(item.tenantId)?.name ?? 'Organization', to: `/billing/${item.id}`, icon: FileText, group: 'Invoice' })),
  ].filter((item) => !q || `${item.label} ${item.meta} ${item.group}`.toLowerCase().includes(q)).slice(0, 12)

  function choose(to: string) {
    navigate(to)
    setQuery('')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-5">
        <SheetTitle className="text-xl font-bold">Search control plane</SheetTitle>
        <SheetDescription className="text-muted mt-1 text-sm">Find organizations, users, applications, subscriptions and invoices.</SheetDescription>
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} leftIcon={<Search />} placeholder="Type a name, email, code or invoice…" className="mt-5" />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{results.length} results</p>
        <div className="mt-4 space-y-2">
          {results.length ? results.map((item) => (
            <button key={`${item.group}-${item.key}`} type="button" onClick={() => choose(item.to)} className="hover:bg-surface flex w-full items-center gap-3 rounded-2xl p-3 text-left">
              <span className="bg-surface flex size-10 shrink-0 items-center justify-center rounded-xl"><item.icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.label}</span><span className="text-muted block truncate text-xs">{item.meta}</span></span>
              <Badge variant="default">{item.group}</Badge>
            </button>
          )) : <p className="text-muted py-10 text-center text-sm">No matches. Try a name, email or code.</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
