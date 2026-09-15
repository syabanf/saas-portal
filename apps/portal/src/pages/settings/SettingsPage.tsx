import { fmtDateTime } from '@scp/fixtures'
import type { IntegrationConfig } from '@scp/integration'
import { WORKSPACE_ROLE_LABEL } from '@scp/types'
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
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  FormField,
  Input,
  KeyValue,
  PageHeader,
} from '@scp/ui'
import { UserRound } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useAuth, useCurrentUser } from '../../auth/auth'
import { Mono } from '../../components/badges'
import { useApi } from '../../state/api'
import { actorOf, useAppState, useScoped } from '../../state/app-state'

function OrganizationCard() {
  const user = useCurrentUser()
  const { member } = useAuth()
  const { tenant, dispatch } = useScoped()
  const [name, setName] = React.useState(tenant?.name ?? '')
  const [billingEmail, setBillingEmail] = React.useState(tenant?.billingEmail ?? '')
  const [country, setCountry] = React.useState(tenant?.country ?? '')
  const [saved, setSaved] = React.useState(false)
  const isAdmin = member?.workspaceRole === 'workspace_admin'

  React.useEffect(() => {
    setName(tenant?.name ?? '')
    setBillingEmail(tenant?.billingEmail ?? '')
    setCountry(tenant?.country ?? '')
  }, [tenant])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    dispatch({
      type: 'tenants/upsert',
      tenant: {
        ...tenant,
        name: name.trim(),
        billingEmail: billingEmail.trim(),
        country: country.trim(),
        updatedAt: new Date().toISOString(),
      },
      actor: actorOf(user),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>
          {isAdmin
            ? 'Shown on invoices and in the platform console.'
            : 'Only workspace admins can edit the organization profile.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="org-name" className="sm:col-span-2">
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              required
            />
          </FormField>
          <FormField label="Billing email" htmlFor="org-email">
            <Input
              id="org-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              disabled={!isAdmin}
              required
            />
          </FormField>
          <FormField label="Country" htmlFor="org-country" hint="Two-letter code">
            <Input
              id="org-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              disabled={!isAdmin}
              required
            />
          </FormField>
          {isAdmin ? (
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit">{saved ? 'Saved' : 'Save profile'}</Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

function AccountCard() {
  const user = useCurrentUser()
  const { member, session, liveSession } = useAuth()
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Your account</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/profile">
            <UserRound /> Open profile
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <KeyValue
          dense
          rows={[
            { label: 'Name', value: user.name },
            { label: 'Email', value: user.email },
            { label: 'Role', value: member ? WORKSPACE_ROLE_LABEL[member.workspaceRole] : '—' },
            { label: 'Session', value: <Mono>{session?.sessionId ?? '—'}</Mono> },
            { label: 'Expires', value: liveSession ? fmtDateTime(liveSession.expiresAt) : '—' },
          ]}
        />
      </CardContent>
    </Card>
  )
}

function IntegrationCard() {
  const { config, setConfig } = useApi()
  const [draft, setDraft] = React.useState<IntegrationConfig>(config)
  React.useEffect(() => setDraft(config), [config])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration</CardTitle>
        <CardDescription>
          Which control plane this portal talks to. Mock serves the in-browser demo data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setConfig(draft)
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <FormField label="Mode" htmlFor="int-mode">
            <Combobox
              id="int-mode"
              value={draft.mode}
              onChange={(mode) => setDraft({ ...draft, mode: mode as IntegrationConfig['mode'] })}
              options={[
                { value: 'mock', label: 'Mock (in-browser)' },
                { value: 'http', label: 'HTTP' },
              ]}
              searchPlaceholder="Search modes"
            />
          </FormField>
          <FormField label="Mock latency (ms)" htmlFor="int-latency">
            <Input
              id="int-latency"
              type="number"
              min={0}
              value={draft.mockLatencyMs}
              onChange={(e) =>
                setDraft({ ...draft, mockLatencyMs: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </FormField>
          <FormField label="Base URL" htmlFor="int-base" className="sm:col-span-2">
            <Input
              id="int-base"
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="secondary">
              Save integration
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DemoDataCard() {
  const { resetDemo } = useAppState()
  const [open, setOpen] = React.useState(false)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Everything lives in this browser. Resetting restores the seeded organizations,
          subscriptions and invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="border-danger text-danger hover:bg-danger-soft"
          onClick={() => setOpen(true)}
        >
          Reset demo data
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                Every change made in this browser is discarded and the seed data returns.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetDemo()
                  setOpen(false)
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Organization profile, your account and how this portal connects."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrganizationCard />
        <AccountCard />
        <IntegrationCard />
        <DemoDataCard />
      </div>
    </div>
  )
}
