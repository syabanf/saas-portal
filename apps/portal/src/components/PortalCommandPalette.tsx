import { Badge, Input, Sheet, SheetContent, SheetDescription, SheetTitle } from '@scp/ui'
import { CreditCard, FileText, Search, Shapes, Users } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/auth'
import { useScoped } from '../state/app-state'

export function PortalCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { applications, invoices, members } = useScoped()
  const { member } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const q = query.trim().toLowerCase()
  const admin = member?.workspaceRole === 'workspace_admin'
  const results = [
    ...applications.map((item) => ({
      key: item.app.id,
      label: item.app.name,
      meta: item.access.state.replaceAll('_', ' '),
      to: `/applications?q=${encodeURIComponent(item.app.name)}`,
      icon: Shapes,
      group: 'Application',
    })),
    ...(admin
      ? invoices.map((item) => ({
          key: item.id,
          label: item.number,
          meta: item.status,
          to: `/billing/${item.id}`,
          icon: FileText,
          group: 'Invoice',
        }))
      : []),
    ...(admin
      ? members.map((item) => ({
          key: item.id,
          label: item.user.name,
          meta: item.user.email,
          to: '/users',
          icon: Users,
          group: 'User',
        }))
      : []),
    ...(admin
      ? applications
          .filter((item) => item.subscription)
          .map((item) => ({
            key: `sub-${item.app.id}`,
            label: `${item.app.name} subscription`,
            meta: item.subscription!.status.replaceAll('_', ' '),
            to: `/subscription?app=${item.app.id}`,
            icon: CreditCard,
            group: 'Subscription',
          }))
      : []),
  ]
    .filter((item) => !q || `${item.label} ${item.meta} ${item.group}`.toLowerCase().includes(q))
    .slice(0, 12)

  function choose(to: string) {
    navigate(to)
    setQuery('')
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-5">
        <SheetTitle className="text-xl font-bold">Search workspace</SheetTitle>
        <SheetDescription className="text-muted mt-1 text-sm">
          Find applications{admin ? ', users, subscriptions and invoices' : ''}.
        </SheetDescription>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leftIcon={<Search />}
          placeholder="Type to search…"
          className="mt-5"
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {results.length} results
        </p>
        <div className="mt-4 space-y-2">
          {results.length ? (
            results.map((item) => (
              <button
                key={`${item.group}-${item.key}`}
                type="button"
                onClick={() => choose(item.to)}
                className="hover:bg-surface flex min-h-11 w-full items-center gap-3 rounded-2xl p-3 text-left"
              >
                <span className="bg-surface flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="text-muted block truncate text-xs">{item.meta}</span>
                </span>
                <Badge variant="default">{item.group}</Badge>
              </button>
            ))
          ) : (
            <p className="text-muted py-10 text-center text-sm">No matches found.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
