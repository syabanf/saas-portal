import { generateSecret, integrationGuide, newId } from '@scp/fixtures'
import type { ApiClient, Application, ApplicationType, IntegrationMode } from '@scp/types'
import {
  ACCESS_POLICY_LABEL,
  APPLICATION_TYPE_LABEL,
  INTEGRATION_MODES,
  INTEGRATION_MODE_FLOW,
  INTEGRATION_MODE_HINT,
  INTEGRATION_MODE_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
  type AccessPolicyMode,
  type SubscriptionStatus,
} from '@scp/types'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  CodeBlock,
  Combobox,
  FormField,
  Input,
  Kicker,
  PageHeader,
} from '@scp/ui'
import { ArrowRight, ChevronDown, Save, Settings2 } from 'lucide-react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { labelOptions } from '../../lib/options'
import { actorOf, useScoped } from '../../state/app-state'
import {
  ACCESS_POLICIES,
  APPLICATION_TYPES,
  DEFAULT_ALLOWED_STATUSES,
  ISSUER,
  PricingFields,
  TOKEN_LIFETIMES,
  type Pricing,
} from './ProductFields'

interface Draft extends Pricing {
  name: string
  code: string
  type: ApplicationType
  integrationMode: IntegrationMode
  apiUrl: string
  callbackUrl: string
  accessPolicy: AccessPolicyMode
  allowedStatuses: SubscriptionStatus[]
  tokenLifetimeMinutes: number
}

const EMPTY: Draft = {
  name: '',
  code: '',
  type: 'web',
  integrationMode: 'verify',
  apiUrl: '',
  callbackUrl: '',
  accessPolicy: 'subscription',
  allowedStatuses: DEFAULT_ALLOWED_STATUSES,
  tokenLifetimeMinutes: 15,
  priceMonthly: 0,
  priceAnnual: 0,
  currency: 'IDR',
  trialDays: 14,
}

function draftFrom(app: Application): Draft {
  return {
    name: app.name,
    code: app.code,
    type: app.type,
    integrationMode:
      app.integrationMode ?? (app.authMode === 'service_only' ? 'gateway' : 'verify'),
    apiUrl: app.apiUrl ?? '',
    callbackUrl: app.callbackUrl,
    accessPolicy: app.accessPolicy,
    allowedStatuses: app.allowedStatuses,
    tokenLifetimeMinutes: app.tokenLifetimeMinutes,
    priceMonthly: app.priceMonthly,
    priceAnnual: app.priceAnnual,
    currency: app.currency,
    trialDays: app.trialDays,
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Origin of the first URL that parses, so the launcher has somewhere to send people. */
function originOf(...urls: string[]): string {
  for (const url of urls) {
    try {
      return new URL(url).origin
    } catch {
      continue
    }
  }
  return ''
}

/** The request chain for a mode, drawn as chips with arrows between them. */
export function FlowChain({
  mode,
  tone = 'light',
}: {
  mode: IntegrationMode
  tone?: 'light' | 'dark'
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {INTEGRATION_MODE_FLOW[mode].map((step, i) => (
        <React.Fragment key={step}>
          {i > 0 ? (
            <ArrowRight
              className={tone === 'dark' ? 'text-on-ink-muted size-3.5' : 'text-muted size-3.5'}
            />
          ) : null}
          <span
            className={
              tone === 'dark'
                ? 'rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white'
                : 'bg-surface rounded-full px-2.5 py-1 text-[11px] font-semibold'
            }
          >
            {step}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export interface ProductFormProps {
  /** Omit to create a product. */
  application?: Application
}

/**
 * One short form for creating and editing a product. Per product an owner only needs the
 * integration mode plus two URLs; everything else keeps a safe default under Advanced.
 */
export function ProductForm({ application }: ProductFormProps) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { applications, dispatch } = useScoped()
  const editing = application !== undefined
  const [draft, setDraft] = React.useState<Draft>(() =>
    application ? draftFrom(application) : EMPTY,
  )
  const [codeTouched, setCodeTouched] = React.useState(editing)
  const [advanced, setAdvanced] = React.useState(false)
  const [attempted, setAttempted] = React.useState(false)

  const code = codeTouched ? slugify(draft.code) : slugify(draft.name)
  const gateway = draft.integrationMode === 'gateway'
  const duplicate = applications.some((a) => a.code === code && a.id !== application?.id)
  const errors = {
    name: draft.name.trim() === '' ? 'Give the product a name.' : null,
    code:
      code === '' ? 'A code is required.' : duplicate ? 'Another product uses this code.' : null,
    apiUrl:
      draft.apiUrl.trim() === ''
        ? 'Enter the API SaaS Gate should protect.'
        : isUrl(draft.apiUrl.trim())
          ? null
          : 'Enter a full URL, for example https://api.example.com/v1.',
    callbackUrl:
      draft.callbackUrl.trim() === ''
        ? gateway
          ? null
          : 'Enter where users return after signing in.'
        : isUrl(draft.callbackUrl.trim())
          ? null
          : 'Enter a full URL.',
  }
  const valid = Object.values(errors).every((e) => e === null)
  const guide = integrationGuide(
    draft.integrationMode,
    code || 'product',
    draft.apiUrl || 'https://api.example.com',
  )

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function toggleStatus(status: SubscriptionStatus) {
    setDraft((d) => ({
      ...d,
      allowedStatuses: d.allowedStatuses.includes(status)
        ? d.allowedStatuses.filter((s) => s !== status)
        : [...d.allowedStatuses, status],
    }))
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) {
      setAttempted(true)
      return
    }
    const now = new Date().toISOString()
    const actor = actorOf(user)
    const apiUrl = draft.apiUrl.trim()
    const callbackUrl = draft.callbackUrl.trim()
    const app: Application = {
      id: application?.id ?? newId('app'),
      name: draft.name.trim(),
      code,
      baseUrl: originOf(callbackUrl, apiUrl),
      type: draft.type,
      status: application?.status ?? 'active',
      authMode: gateway ? 'service_only' : 'sso',
      integrationMode: draft.integrationMode,
      apiUrl,
      accessPolicy: draft.accessPolicy,
      allowedStatuses: draft.allowedStatuses,
      priceMonthly: draft.priceMonthly,
      priceAnnual: draft.priceAnnual,
      currency: draft.currency,
      trialDays: draft.trialDays,
      tokenLifetimeMinutes: draft.tokenLifetimeMinutes,
      audience: code,
      issuer: ISSUER,
      callbackUrl,
      health: application?.health ?? 'healthy',
      lastSuccessAt: application?.lastSuccessAt ?? now,
      lastFailure: application?.lastFailure ?? null,
      createdAt: application?.createdAt ?? now,
      updatedAt: now,
    }
    dispatch({ type: 'applications/upsert', application: app, actor })

    if (!editing) {
      const client: ApiClient = {
        id: newId('cli'),
        applicationId: app.id,
        environment: 'production',
        name: `${app.name} Production`,
        clientId: `${code.replace(/-/g, '_')}_prod_${newId('').slice(1, 5)}`,
        secretHint: generateSecret().slice(-4),
        status: 'active',
        allowedRedirectUris: callbackUrl ? [callbackUrl] : [],
        allowedScopes: ['access:exchange', 'subscriptions:read'],
        createdAt: now,
        rotatedAt: null,
      }
      dispatch({ type: 'apiClients/create', client, actor })
    }
    navigate(`/applications/${app.id}`)
  }

  const show = (key: keyof typeof errors) => (attempted ? errors[key] : null)

  return (
    <form onSubmit={save}>
      <PageHeader
        title={editing ? `Edit ${application.name}` : 'New product'}
        description="Pick how SaaS Gate protects the product, then point it at your API."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(editing ? `/applications/${application.id}` : '/applications')
              }
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save /> {editing ? 'Save product' : 'Create product'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
              <CardDescription>
                The name customers see and the code used in URLs and tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Name" error={show('name') ?? undefined}>
                <Input
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="WIT IoT Platform"
                  autoFocus={!editing}
                />
              </FormField>
              <FormField
                label="Code"
                hint="Used as the token audience."
                error={show('code') ?? undefined}
              >
                <Input
                  value={code}
                  onChange={(e) => {
                    setCodeTouched(true)
                    set('code', e.target.value)
                  }}
                  placeholder="wit-iot"
                  className="[&_input]:font-mono"
                />
              </FormField>
              <FormField label="Type" className="sm:col-span-2">
                <Combobox
                  value={draft.type}
                  onChange={(v) => set('type', v as ApplicationType)}
                  options={labelOptions(APPLICATION_TYPES, APPLICATION_TYPE_LABEL)}
                  aria-label="Product type"
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration</CardTitle>
              <CardDescription>Choose who calls whom, then give us the two URLs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INTEGRATION_MODES.map((mode) => {
                  const selected = draft.integrationMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => set('integrationMode', mode)}
                      data-selected={selected}
                      className="border-border data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft/40 hover:bg-surface flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            selected
                              ? 'border-accent flex size-5 items-center justify-center rounded-full border-2'
                              : 'border-silver flex size-5 items-center justify-center rounded-full border-2'
                          }
                        >
                          {selected ? <span className="bg-accent size-2.5 rounded-full" /> : null}
                        </span>
                        <span className="text-sm font-semibold">
                          {INTEGRATION_MODE_LABEL[mode]}
                        </span>
                      </span>
                      <span className="text-muted text-xs">{INTEGRATION_MODE_HINT[mode]}</span>
                      <FlowChain mode={mode} />
                    </button>
                  )
                })}
              </div>

              <FormField
                label="API URL"
                hint={
                  gateway
                    ? 'SaaS Gate forwards allowed requests here.'
                    : 'The API this product serves once the check passes.'
                }
                error={show('apiUrl') ?? undefined}
              >
                <Input
                  value={draft.apiUrl}
                  onChange={(e) => set('apiUrl', e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="[&_input]:font-mono [&_input]:text-xs"
                />
              </FormField>
              <FormField
                label={gateway ? 'Callback URL (optional)' : 'Callback URL'}
                hint="Where users return after signing in through SaaS Gate."
                error={show('callbackUrl') ?? undefined}
              >
                <Input
                  value={draft.callbackUrl}
                  onChange={(e) => set('callbackUrl', e.target.value)}
                  placeholder="https://app.example.com/auth/callback"
                  className="[&_input]:font-mono [&_input]:text-xs"
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Organizations subscribe per product, monthly or annually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingFields
                value={draft}
                onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                tone="nested"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <button
                type="button"
                onClick={() => setAdvanced((a) => !a)}
                aria-expanded={advanced}
                className="flex w-full items-center gap-2 text-left"
              >
                <Settings2 className="text-muted size-4" />
                <span className="flex-1 text-sm font-semibold">Advanced settings</span>
                <ChevronDown
                  className={advanced ? 'text-muted size-4' : 'text-muted size-4 -rotate-90'}
                />
              </button>
              {advanced ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Access policy">
                      <Combobox
                        value={draft.accessPolicy}
                        onChange={(v) => set('accessPolicy', v as AccessPolicyMode)}
                        options={labelOptions(ACCESS_POLICIES, ACCESS_POLICY_LABEL)}
                        tone="nested"
                        aria-label="Access policy"
                      />
                    </FormField>
                    <FormField label="Token lifetime">
                      <Combobox
                        value={String(draft.tokenLifetimeMinutes)}
                        onChange={(v) => set('tokenLifetimeMinutes', Number(v))}
                        options={TOKEN_LIFETIMES.map((m) => ({
                          value: String(m),
                          label: `${m} minutes`,
                        }))}
                        tone="nested"
                        aria-label="Token lifetime"
                      />
                    </FormField>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium">
                      Subscription statuses that keep access
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUBSCRIPTION_STATUSES.map((status) => (
                        <Chip
                          key={status}
                          type="button"
                          active={draft.allowedStatuses.includes(status)}
                          activeTone="ink"
                          onClick={() => toggleStatus(status)}
                        >
                          {SUBSCRIPTION_STATUS_LABEL[status]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="bg-surface rounded-2xl p-3 text-xs">
                    <p className="text-muted">
                      Issuer <code className="font-mono">{ISSUER}</code>
                    </p>
                    <p className="text-muted mt-1">
                      Audience <code className="font-mono">{code || 'product-code'}</code>, signed
                      and rotated by SaaS Gate.
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="rounded-hero bg-ink text-on-ink shadow-float relative overflow-hidden p-5">
            <div className="bg-accent/30 pointer-events-none absolute -top-20 -right-20 size-56 rounded-full blur-3xl" />
            <div className="relative space-y-3">
              <Kicker className="text-on-ink-muted">Request flow</Kicker>
              <p className="text-sm font-semibold">
                {INTEGRATION_MODE_LABEL[draft.integrationMode]}
              </p>
              <FlowChain mode={draft.integrationMode} tone="dark" />
              <p className="text-on-ink-muted text-xs">{guide.summary}</p>
              <dl className="space-y-2 pt-1 text-xs">
                <div>
                  <dt className="text-on-ink-muted">API URL</dt>
                  <dd className="font-mono break-all">{draft.apiUrl || 'Not set yet'}</dd>
                </div>
                <div>
                  <dt className="text-on-ink-muted">Callback URL</dt>
                  <dd className="font-mono break-all">{draft.callbackUrl || 'Not set yet'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What you build</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {guide.todo.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Badge variant="muted" className="mt-0.5 shrink-0">
                      {guide.todo.indexOf(item) + 1}
                    </Badge>
                    <span className="text-body">{item}</span>
                  </li>
                ))}
              </ul>
              <CodeBlock code={guide.code} tone="dark" />
              {!editing ? (
                <p className="text-muted text-xs">
                  A production API client is created with the product. Its secret is shown once on
                  the product page.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
