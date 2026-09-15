import { envSnippet, sdkSnippet } from '@scp/fixtures'
import type { SdkStack } from '@scp/types'
import { SDK_STACK_LABEL } from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  ChipRow,
  CodeBlock,
  Combobox,
  EmptyState,
  FormField,
  PageHeader,
  SettingRow,
  type BadgeTone,
} from '@scp/ui'
import {
  Activity,
  AppWindow,
  ChevronRight,
  HeartPulse,
  KeyRound,
  Link2,
  Receipt,
  Webhook,
} from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Mono } from '../../components/badges'
import { useScoped } from '../../state/app-state'
import { applicationOptions } from '../../lib/options'

const STACKS = Object.keys(SDK_STACK_LABEL) as SdkStack[]

type Method = 'GET' | 'POST' | 'PATCH'
const METHOD_TONE: Record<Method, BadgeTone> = { GET: 'outline', POST: 'ink', PATCH: 'info' }

const API_SURFACE: { group: string; routes: [Method, string][] }[] = [
  {
    group: 'Identity',
    routes: [
      ['POST', '/auth/login'],
      ['POST', '/auth/refresh'],
      ['POST', '/auth/logout'],
      ['GET', '/auth/me'],
    ],
  },
  {
    group: 'Access Broker',
    routes: [
      ['POST', '/access/exchange'],
      ['POST', '/access/code/exchange'],
    ],
  },
  {
    group: 'Tenant',
    routes: [
      ['GET', '/tenants'],
      ['POST', '/tenants'],
      ['GET', '/tenants/:id'],
      ['PATCH', '/tenants/:id'],
    ],
  },
  {
    group: 'Applications',
    routes: [
      ['GET', '/applications'],
      ['POST', '/applications'],
      ['GET', '/applications/:id'],
      ['PATCH', '/applications/:id'],
    ],
  },
  {
    group: 'Subscription',
    routes: [
      ['GET', '/subscriptions'],
      ['POST', '/subscriptions'],
      ['PATCH', '/subscriptions/:id'],
      ['POST', '/subscriptions/:id/change-period'],
      ['POST', '/subscriptions/:id/cancel'],
      ['POST', '/subscriptions/:id/reactivate'],
    ],
  },
  { group: 'Usage', routes: [['POST', '/usage/report']] },
  {
    group: 'API Clients',
    routes: [
      ['GET', '/applications/:id/clients'],
      ['POST', '/applications/:id/clients'],
      ['POST', '/clients/:id/rotate'],
      ['POST', '/clients/:id/revoke'],
    ],
  },
]

export function SdkPage() {
  const { applications, applicationsById, clientsByApplication } = useScoped()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const requested = params.get('app')
  const appId =
    requested && applicationsById.has(requested) ? requested : (applications[0]?.id ?? '')
  const app = applicationsById.get(appId)
  const [stack, setStack] = React.useState<SdkStack>('node')

  if (!app) {
    return (
      <div className="space-y-4">
        <PageHeader title="SDK & integration" />
        <EmptyState
          icon={<AppWindow />}
          title="No applications yet"
          description="Register an application first; the SDK snippets are generated from its audience and callback URL."
          action={
            <Button asChild>
              <Link to="/applications/new">Create application</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const productionClient = (clientsByApplication.get(app.id) ?? []).find(
    (c) => c.environment === 'production' && c.status === 'active',
  )
  const snippet = sdkSnippet(stack, app.audience)
  const env = envSnippet(
    productionClient?.clientId ?? '<create a production client>',
    app.audience,
    app.callbackUrl,
  )

  const checklist = [
    {
      icon: <AppWindow />,
      title: 'Create application',
      subtitle: app.name,
      to: '/applications/new',
    },
    {
      icon: <KeyRound />,
      title: 'Generate client credential',
      subtitle: productionClient ? productionClient.clientId : 'No production client yet',
      to: '/api-clients',
    },
    {
      icon: <Link2 />,
      title: 'Configure callback',
      subtitle: app.callbackUrl,
      to: `/applications/${app.id}`,
    },
    {
      icon: <Receipt />,
      title: 'Assign subscription',
      subtitle: 'Give an organization access',
      to: '/subscriptions',
    },
    {
      icon: <HeartPulse />,
      title: 'Test connection',
      subtitle: 'Verify tokens and webhooks',
      to: '/health',
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="SDK & integration"
        description="Everything a developer needs to connect an application without learning the platform internals."
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[minmax(0,16rem)_1fr] md:items-end">
          <FormField label="Application">
            <Combobox
              value={app.id}
              onChange={(v) => setParams({ app: v }, { replace: true })}
              options={applicationOptions(applications)}
              searchPlaceholder="Search applications"
              tone="nested"
            />
          </FormField>
          <div>
            <p className="mb-1.5 text-sm font-medium">Stack</p>
            <ChipRow>
              {STACKS.map((s) => (
                <Chip key={s} active={s === stack} activeTone="ink" onClick={() => setStack(s)}>
                  {SDK_STACK_LABEL[s]}
                </Chip>
              ))}
            </ChipRow>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Install</CardTitle>
              <CardDescription>
                <Mono>{snippet.install}</Mono>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                title={`${SDK_STACK_LABEL[stack]} · verify an app token`}
                code={snippet.code}
                language={snippet.language}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>
                Generated from the audience, callback URL and the active production client of{' '}
                {app.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock title=".env" code={env} tone="light" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API surface</CardTitle>
              <CardDescription>
                REST routes behind the SDK. Relative to the Core API base URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {API_SURFACE.map((g) => (
                <div key={g.group} className="bg-surface-2 rounded-2xl p-3">
                  <p className="text-muted mb-2 text-[11px] font-semibold tracking-wider uppercase">
                    {g.group}
                  </p>
                  <ul className="space-y-1.5">
                    {g.routes.map(([method, path]) => (
                      <li key={`${method} ${path}`} className="flex items-center gap-2">
                        <Badge
                          variant={METHOD_TONE[method]}
                          className="w-16 justify-center font-mono"
                        >
                          {method}
                        </Badge>
                        <Mono className="truncate">{path}</Mono>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>
                Five steps from a new application to a passing connection test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklist.map((item, i) => (
                <SettingRow
                  key={item.title}
                  icon={item.icon}
                  title={`${i + 1}. ${item.title}`}
                  subtitle={item.subtitle}
                  trailing={<ChevronRight className="text-muted size-4" />}
                  onClick={() => navigate(item.to)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer tools</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="secondary" asChild>
                <Link to="/health">
                  <HeartPulse />
                  Test connection
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/webhooks">
                  <Webhook />
                  Webhook tester
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/logs?app=${app.id}`}>
                  <Activity />
                  Integration logs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
