import { useT } from '@scp/i18n'
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
  const t = useT()
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
      meta: t(`status.access.${item.access.state}`),
      to: `/applications?q=${encodeURIComponent(item.app.name)}`,
      icon: Shapes,
      group: t('palette.group.application'),
    })),
    ...(admin
      ? invoices.map((item) => ({
          key: item.id,
          label: item.number,
          meta: t(`status.invoice.${item.status}`),
          to: `/billing/${item.id}`,
          icon: FileText,
          group: t('palette.group.invoice'),
        }))
      : []),
    ...(admin
      ? members.map((item) => ({
          key: item.id,
          label: item.user.name,
          meta: item.user.email,
          to: '/users',
          icon: Users,
          group: t('palette.group.user'),
        }))
      : []),
    ...(admin
      ? applications
          .filter((item) => item.subscription)
          .map((item) => ({
            key: `sub-${item.app.id}`,
            label: t('palette.subscriptionOf', { name: item.app.name }),
            meta: t(`status.subscription.${item.subscription!.status}`),
            to: `/subscription?app=${item.app.id}`,
            icon: CreditCard,
            group: t('palette.group.subscription'),
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
        <SheetTitle className="text-xl font-bold">{t('palette.title')}</SheetTitle>
        <SheetDescription className="text-muted mt-1 text-sm">
          {admin ? t('palette.descriptionAdmin') : t('palette.description')}
        </SheetDescription>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leftIcon={<Search />}
          placeholder={t('palette.placeholder')}
          className="mt-5"
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {t('palette.results', { count: results.length })}
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
            <p className="text-muted py-10 text-center text-sm">{t('palette.noMatches')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
