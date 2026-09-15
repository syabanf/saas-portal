import { Button, Card, CardContent, CardHeader, CardTitle, ProgressBar } from '@scp/ui'
import { Check, ChevronRight, Circle, Rocket, X } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth'
import { useScoped } from '../state/app-state'

const DISMISSED_KEY = 'scp.portal.onboarding-dismissed.v1'

export function OnboardingChecklist() {
  const { member } = useAuth()
  const { state, tenant, tenantId, members, applications } = useScoped()
  const [dismissed, setDismissed] = React.useState(
    () => localStorage.getItem(DISMISSED_KEY) === tenantId,
  )
  if (member?.workspaceRole !== 'workspace_admin' || dismissed) return null

  const items = [
    { label: 'Accept your workspace invitation', done: member.status === 'active', to: '/' },
    {
      label: 'Confirm application access',
      done: applications.some(
        (item) => item.access.state === 'active' || item.access.state === 'trial',
      ),
      to: '/applications',
    },
    { label: 'Invite your team', done: members.length > 1, to: '/users' },
    { label: 'Review billing details', done: Boolean(tenant?.billingEmail), to: '/billing' },
    {
      label: 'Open your first application',
      done: state.accessLogs.some((log) => log.tenantId === tenantId && log.decision === 'allow'),
      to: '/applications',
    },
  ]
  const completed = items.filter((item) => item.done).length

  return (
    <Card className="border-accent/20 border">
      <CardHeader className="flex-row items-start gap-3">
        <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
          <Rocket className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle>Finish workspace setup</CardTitle>
          <p className="text-muted mt-1 text-sm">
            {completed} of {items.length} steps complete
          </p>
          <ProgressBar value={completed} max={items.length} className="mt-3" />
        </div>
        {completed === items.length ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss checklist"
            onClick={() => {
              localStorage.setItem(DISMISSED_KEY, tenantId)
              setDismissed(true)
            }}
          >
            <X />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="h-auto justify-start rounded-2xl px-3 py-3 text-left"
            asChild
          >
            <Link to={item.to}>
              {item.done ? (
                <span className="bg-success-soft text-success flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" />
                </span>
              ) : (
                <Circle className="text-muted size-5 shrink-0" />
              )}
              <span className="min-w-0 flex-1 whitespace-normal">{item.label}</span>
              <ChevronRight className="text-muted size-4 shrink-0" />
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
