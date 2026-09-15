import { avatarColor, fmtNumber, initials } from '@scp/fixtures'
import type { IntegrationConfig } from '@scp/integration'
import { BILLING_PERIODS, BILLING_PERIOD_LABEL } from '@scp/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeBlock,
  Combobox,
  FormField,
  Input,
  KeyValue,
  Kicker,
  PageHeader,
} from '@scp/ui'
import { Database, Download, RotateCcw, Save, Server, UserRound } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono } from '../../components/badges'
import { useApi } from '../../state/api'
import { useAppState } from '../../state/app-state'
import { downloadJson } from '../audit/downloadJson'

const MODE_LABEL: Record<IntegrationConfig['mode'], string> = {
  mock: 'Mock control plane',
  http: 'HTTP backend',
}
const MODE_OPTIONS = (['mock', 'http'] satisfies IntegrationConfig['mode'][]).map((value) => ({
  value,
  label: MODE_LABEL[value],
}))

const PORTS: { port: number; service: string; note?: string }[] = [
  { port: 3000, service: 'SaaS Portal', note: 'this demo: 5174' },
  { port: 3100, service: 'SaaS Core API' },
  { port: 3200, service: 'Identity Service' },
  { port: 3300, service: 'Access Broker' },
  { port: 3400, service: 'Mock Payment' },
  { port: 3500, service: 'Webhook Receiver' },
  { port: 4101, service: 'IoT Demo App' },
  { port: 4102, service: 'ERP Demo App' },
  { port: 4103, service: 'CRM Demo App' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
]

const ENV_VARS = `DATABASE_URL=
REDIS_URL=
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
SAAS_ISSUER=http://localhost:3200
SAAS_PORTAL_URL=http://localhost:3000
ACCESS_BROKER_URL=http://localhost:3300`

export function SettingsPage() {
  const { config, setConfig } = useApi()
  const { state, resetDemo } = useAppState()
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState<IntegrationConfig>(config)
  const [saved, setSaved] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)
  React.useEffect(() => setDraft(config), [config])

  const dirty = JSON.stringify(draft) !== JSON.stringify(config)

  function set<K extends keyof IntegrationConfig>(key: K, value: IntegrationConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    setConfig(draft)
    setSaved(true)
  }

  const counts = [
    { label: 'Organizations', value: state.tenants.length },
    { label: 'Users', value: state.users.length },
    { label: 'Applications', value: state.applications.length },
    { label: 'Subscriptions', value: state.subscriptions.length },
    ...BILLING_PERIODS.map((period) => ({
      label: `${BILLING_PERIOD_LABEL[period]} subscriptions`,
      value: state.subscriptions.filter((sub) => sub.billingPeriod === period).length,
    })),
    { label: 'Invoices', value: state.invoices.length },
    { label: 'Payments', value: state.payments.length },
    { label: 'Webhooks', value: state.webhooks.length },
    { label: 'Deliveries', value: state.deliveries.length },
    { label: 'Access logs', value: state.accessLogs.length },
    { label: 'Audit entries', value: state.auditLogs.length },
  ].map((c) => ({
    label: c.label,
    value: <span className="font-semibold tabular-nums">{fmtNumber(c.value)}</span>,
  }))
  const half = Math.ceil(counts.length / 2)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Integration mode, demo data and the local development layout."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-ink text-on-ink flex flex-wrap items-center gap-3 p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 [&_svg]:size-5">
              <Server />
            </div>
            <div className="min-w-[10rem] flex-1">
              <Kicker className="text-on-ink-muted">Integration mode</Kicker>
              <p className="text-lg leading-tight font-bold">{MODE_LABEL[config.mode]}</p>
            </div>
            <Combobox
              value={draft.mode}
              onChange={(v) => set('mode', v as IntegrationConfig['mode'])}
              options={MODE_OPTIONS}
              searchPlaceholder="Search modes…"
              className="w-full sm:w-56"
            />
          </div>
          <form onSubmit={save}>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Core API base URL">
                  <Input
                    value={draft.baseUrl}
                    onChange={(e) => set('baseUrl', e.target.value)}
                    tone="nested"
                    className="[&_input]:font-mono [&_input]:text-xs"
                  />
                </FormField>
                <FormField label="Issuer">
                  <Input
                    value={draft.issuer}
                    onChange={(e) => set('issuer', e.target.value)}
                    tone="nested"
                    className="[&_input]:font-mono [&_input]:text-xs"
                  />
                </FormField>
                <FormField label="Access broker URL">
                  <Input
                    value={draft.accessBrokerUrl}
                    onChange={(e) => set('accessBrokerUrl', e.target.value)}
                    tone="nested"
                    className="[&_input]:font-mono [&_input]:text-xs"
                  />
                </FormField>
                <FormField label="Mock latency (ms)" hint="Only applies to the mock control plane.">
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={draft.mockLatencyMs}
                    onChange={(e) => set('mockLatencyMs', Math.max(0, Number(e.target.value)))}
                    tone="nested"
                    disabled={draft.mode !== 'mock'}
                  />
                </FormField>
              </div>
              <p className="text-muted text-xs">
                HTTP mode expects the endpoints listed on the <Mono>SDK</Mono> page to be served
                from the base URL.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!dirty}>
                  <Save />
                  Save
                </Button>
                {saved && !dirty ? (
                  <span className="text-success text-xs">Saved. The API adapter was rebuilt.</span>
                ) : null}
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo data</CardTitle>
            <CardDescription>
              Seeded fixtures kept in this browser. Reset returns every change made in the console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <KeyValue dense rows={counts.slice(0, half)} />
              <KeyValue dense rows={counts.slice(half)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent-soft"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw />
                Reset demo data
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  downloadJson(`scp-state-${new Date().toISOString().slice(0, 10)}.json`, state)
                }
              >
                <Download />
                Export state
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Avatar initials={initials(user.name)} color={avatarColor(user.id)} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-muted truncate text-xs">{user.email}</p>
            </div>
            <Badge variant="ink">Platform admin</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/profile">
                <UserRound /> Open profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="text-muted size-4" />
              Local ports
            </CardTitle>
            <CardDescription>Suggested port map for local development.</CardDescription>
          </CardHeader>
          <CardContent>
            <KeyValue
              dense
              rows={PORTS.map((p) => ({
                label: String(p.port),
                value: (
                  <span>
                    {p.service}
                    {p.note ? <span className="text-muted text-xs"> · {p.note}</span> : null}
                  </span>
                ),
              }))}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Environment variables</CardTitle>
            <CardDescription>SaaS platform services read these at boot.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock title=".env · saas platform" code={ENV_VARS} />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              Every organization, subscription, client and log created in this browser is replaced
              by the seeded fixtures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemo()
                setConfirmReset(false)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
