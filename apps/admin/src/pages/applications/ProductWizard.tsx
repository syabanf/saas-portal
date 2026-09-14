import { envSnippet, fmtIdr, generateSecret, newId, sdkSnippet } from '@scp/fixtures'
import type {
  AccessPolicyMode,
  ApiClient,
  Application,
  ApplicationType,
  AuthMode,
  SdkStack,
  SubscriptionStatus,
} from '@scp/types'
import {
  ACCESS_POLICY_LABEL,
  APPLICATION_TYPE_LABEL,
  AUTH_MODE_LABEL,
  SDK_STACK_LABEL,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABEL,
} from '@scp/types'
import {
  Badge,
  Banner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Chip,
  ChipRow,
  CodeBlock,
  FormField,
  Input,
  KeyValue,
  OptionCard,
  Select,
  Stepper,
  Textarea,
  Toggle,
  type KeyValueRow,
} from '@scp/ui'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, FileClock, Save } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { Mono, SubscriptionBadge } from '../../components/badges'
import { slugify } from '../../components/master/slug'
import { actorOf, useScoped } from '../../state/app-state'
import { UnsavedChangesGuard } from '../../components/UnsavedChangesGuard'
import {
  ACCESS_POLICIES,
  APPLICATION_TYPES,
  AUTH_MODES,
  DEFAULT_ALLOWED_STATUSES,
  ISSUER,
  PricingFields,
  TOKEN_LIFETIMES,
  callbackUrlFor,
  type Pricing,
} from './ProductFields'
import { TestConnectionStep } from './TestConnectionStep'

const STEP_TITLES = [
  'Basic information',
  'Authentication',
  'Access & pricing',
  'Token',
  'Integration',
]
const LAST_STEP = STEP_TITLES.length
const STACKS: SdkStack[] = ['node', 'next', 'go', 'php', 'flutter', 'rest']
const SSO_CAPABILITIES = ['Token exchange', 'Authorization code', 'Short-lived app token']
const TYPE_HINT: Record<ApplicationType, string> = {
  web: 'Browser app with a redirect callback.',
  mobile: 'Native or Flutter app using a custom scheme.',
  backend: 'Service that verifies tokens server-side.',
  external: 'Third-party system reached through webhooks.',
}
const AUTH_HINT: Record<AuthMode, string> = {
  sso: 'Users sign in once on the platform and land in the application with a short-lived app token.',
  own_login: 'The application keeps its login screen and only checks subscription access.',
  service_only: 'No users. Machine-to-machine access with a client credential.',
}
const POLICY_HINT: Record<AccessPolicyMode, string> = {
  subscription: 'Only organizations with a matching subscription may enter.',
  free: 'Every user of every organization may enter.',
  manual: 'A platform admin grants access per organization.',
}

interface Draft extends Pricing {
  name: string
  code: string
  baseUrl: string
  type: ApplicationType
  authMode: AuthMode
  accessPolicy: AccessPolicyMode
  allowedStatuses: SubscriptionStatus[]
  tokenLifetimeMinutes: number
  customAudience: string
  customClaims: string
  keyRotationDays: number
  clockToleranceSec: number
  stack: SdkStack
}

const EMPTY: Draft = {
  name: '',
  code: '',
  baseUrl: '',
  type: 'web',
  authMode: 'sso',
  accessPolicy: 'subscription',
  allowedStatuses: DEFAULT_ALLOWED_STATUSES,
  priceMonthly: 0,
  priceAnnual: 0,
  currency: 'IDR',
  trialDays: 14,
  tokenLifetimeMinutes: 15,
  customAudience: '',
  customClaims: '',
  keyRotationDays: 90,
  clockToleranceSec: 30,
  stack: 'node',
}
const DRAFT_KEY = 'scp.admin.product-draft.v1'

function readProductDraft(): { draft: Draft; step: number } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    return saved?.draft ? saved : null
  } catch {
    return null
  }
}

function draftFrom(app: Application): Draft {
  return {
    ...EMPTY,
    name: app.name,
    code: app.code,
    baseUrl: app.baseUrl,
    type: app.type,
    authMode: app.authMode,
    accessPolicy: app.accessPolicy,
    allowedStatuses: app.allowedStatuses,
    priceMonthly: app.priceMonthly,
    priceAnnual: app.priceAnnual,
    currency: app.currency,
    trialDays: app.trialDays,
    tokenLifetimeMinutes: app.tokenLifetimeMinutes,
    customAudience: app.audience === app.code ? '' : app.audience,
  }
}

export interface ProductWizardProps {
  /** Existing product to edit; omit to create a new one. */
  application?: Application
}

/**
 * Product setup wizard (blueprint §33): six steps with safe defaults and advanced settings folded away.
 * Create mode ends with the connection checklist and issues a production API client;
 * edit mode ends with a review of every step and saves in place.
 */
export function ProductWizard({ application }: ProductWizardProps) {
  const { applications, clientsByApplication, dispatch } = useScoped()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const editing = application !== undefined
  const restored = React.useRef(editing ? null : readProductDraft())
  const baseline = React.useRef(application ? draftFrom(application) : EMPTY)
  // Edit opens on the review so the stepper lets the admin jump to any step.
  const [step, setStep] = React.useState(editing ? LAST_STEP : (restored.current?.step ?? 0))
  const [draft, setDraft] = React.useState<Draft>(() =>
    application ? draftFrom(application) : (restored.current?.draft ?? EMPTY),
  )
  const [codeTouched, setCodeTouched] = React.useState(editing)
  const [attempted, setAttempted] = React.useState(false)
  const [advanced, setAdvanced] = React.useState(false)
  const [ready, setReady] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.current)

  React.useEffect(() => {
    if (editing || !dirty || saved) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }))
  }, [draft, step, dirty, editing, saved])

  const code = slugify(draft.code || draft.name)
  const audience = draft.customAudience.trim() || code
  const callbackUrl = callbackUrlFor(draft.baseUrl)
  const urlRequired = draft.type === 'web' || draft.type === 'external'
  const codeTaken = applications.some((a) => a.code === code && a.id !== application?.id)
  const paid = draft.accessPolicy === 'subscription'

  const errors = {
    name: draft.name.trim() === '' ? 'Give the product a name.' : undefined,
    code:
      code === ''
        ? 'Add a short code.'
        : codeTaken
          ? `Another product already uses the code ${code}.`
          : undefined,
    baseUrl:
      urlRequired && draft.baseUrl.trim() === ''
        ? 'Web and external products need a URL.'
        : undefined,
    pricing: !paid
      ? undefined
      : draft.priceMonthly < 0 || draft.priceAnnual < 0
        ? 'Prices cannot be negative.'
        : draft.priceMonthly === 0 && draft.priceAnnual === 0
          ? 'Set a monthly or annual price.'
          : undefined,
  }
  const stepValid = [
    !errors.name && !errors.code && !errors.baseUrl,
    true,
    !errors.pricing,
    true,
    true,
    editing || ready,
  ]
  const allValid = stepValid.slice(0, LAST_STEP).every(Boolean)
  const showErrors = attempted || editing

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function toggleStatus(st: SubscriptionStatus, on: boolean) {
    set(
      'allowedStatuses',
      on
        ? Array.from(new Set([...draft.allowedStatuses, st]))
        : draft.allowedStatuses.filter((x) => x !== st),
    )
  }

  function goTo(next: number) {
    setAttempted(false)
    setStep(next)
  }

  function next() {
    if (!stepValid[step]) {
      setAttempted(true)
      return
    }
    goTo(step + 1)
  }

  function save() {
    if (!allValid) {
      setAttempted(true)
      setStep(stepValid.findIndex((ok) => !ok))
      return
    }
    const now = new Date().toISOString()
    const actor = actorOf(user)
    const app: Application = {
      id: application?.id ?? newId('app'),
      name: draft.name.trim(),
      code,
      baseUrl: draft.baseUrl.trim(),
      type: draft.type,
      status: application?.status ?? 'active',
      authMode: draft.authMode,
      accessPolicy: draft.accessPolicy,
      allowedStatuses: draft.allowedStatuses,
      priceMonthly: draft.priceMonthly,
      priceAnnual: draft.priceAnnual,
      currency: draft.currency,
      trialDays: draft.trialDays,
      tokenLifetimeMinutes: draft.tokenLifetimeMinutes,
      audience,
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
        allowedScopes: ['access:exchange', 'subscription:read'],
        createdAt: now,
        rotatedAt: null,
      }
      dispatch({ type: 'apiClients/create', client, actor })
    }
    localStorage.removeItem(DRAFT_KEY)
    setSaved(true)
    window.setTimeout(() => navigate(`/applications/${app.id}`), 0)
  }

  const productionClientId =
    (clientsByApplication.get(application?.id ?? '') ?? []).find(
      (c) => c.environment === 'production' && c.status === 'active',
    )?.clientId ?? (editing ? '<client id>' : '<generated on finish>')
  const snippet = sdkSnippet(draft.stack, audience)
  const steps = [...STEP_TITLES, editing ? 'Review' : 'Test connection']
  const backTo = editing ? `/applications/${application.id}` : '/applications'

  const reviewSections: { title: string; rows: KeyValueRow[] }[] = [
    {
      title: STEP_TITLES[0]!,
      rows: [
        { label: 'Name', value: draft.name.trim() || <span className="text-muted">Not set</span> },
        { label: 'Code', value: <Mono>{code}</Mono> },
        {
          label: 'URL',
          value: draft.baseUrl ? (
            <Mono>{draft.baseUrl}</Mono>
          ) : (
            <span className="text-muted">Not set</span>
          ),
        },
        { label: 'Type', value: APPLICATION_TYPE_LABEL[draft.type] },
      ],
    },
    {
      title: STEP_TITLES[1]!,
      rows: [{ label: 'Sign-in', value: AUTH_MODE_LABEL[draft.authMode] }],
    },
    {
      title: STEP_TITLES[2]!,
      rows: [
        { label: 'Access policy', value: ACCESS_POLICY_LABEL[draft.accessPolicy] },
        ...(paid
          ? [
              {
                label: 'Monthly price',
                value: (
                  <span className="tabular-nums">{fmtIdr(draft.priceMonthly, draft.currency)}</span>
                ),
              },
              {
                label: 'Annual price',
                value: (
                  <span className="tabular-nums">{fmtIdr(draft.priceAnnual, draft.currency)}</span>
                ),
              },
              {
                label: 'Trial',
                value: draft.trialDays > 0 ? `${draft.trialDays} days` : 'No trial',
              },
              {
                label: 'Allowed statuses',
                value: (
                  <span className="flex flex-wrap gap-1">
                    {draft.allowedStatuses.length === 0 ? (
                      <span className="text-muted">None</span>
                    ) : (
                      draft.allowedStatuses.map((s) => (
                        <SubscriptionBadge key={s} status={s} dot={false} />
                      ))
                    )}
                  </span>
                ),
              },
            ]
          : []),
      ],
    },
    {
      title: STEP_TITLES[3]!,
      rows: [
        { label: 'Lifetime', value: `${draft.tokenLifetimeMinutes} minutes` },
        { label: 'Audience', value: <Mono>{audience}</Mono> },
        { label: 'Issuer', value: <Mono>{ISSUER}</Mono> },
        {
          label: 'Callback',
          value: callbackUrl ? (
            <Mono>{callbackUrl}</Mono>
          ) : (
            <span className="text-muted">No callback without a URL</span>
          ),
        },
      ],
    },
    {
      title: STEP_TITLES[4]!,
      rows: [{ label: 'SDK stack', value: SDK_STACK_LABEL[draft.stack] }],
    },
  ]

  const content: { title: React.ReactNode; description: React.ReactNode; body: React.ReactNode }[] =
    [
      {
        title: 'What is this product?',
        description: 'The code becomes the token audience, so keep it short and stable.',
        body: (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Product name" error={showErrors ? errors.name : undefined}>
                <Input
                  value={draft.name}
                  onChange={(e) => {
                    set('name', e.target.value)
                    if (!codeTouched) set('code', slugify(e.target.value))
                  }}
                  placeholder="WIT IoT Platform"
                  autoFocus={!editing}
                />
              </FormField>
              <FormField
                label="Product code"
                error={showErrors || codeTaken ? errors.code : undefined}
                hint="Also used as the token audience."
              >
                <Input
                  value={draft.code}
                  onChange={(e) => {
                    setCodeTouched(true)
                    set('code', e.target.value)
                  }}
                  placeholder="wit-iot"
                  className="[&_input]:font-mono"
                />
              </FormField>
              <FormField
                label="Application URL"
                className="sm:col-span-2"
                error={showErrors ? errors.baseUrl : undefined}
                hint={
                  callbackUrl
                    ? `Callback: ${callbackUrl}`
                    : urlRequired
                      ? undefined
                      : 'Optional for mobile and backend products.'
                }
              >
                <Input
                  value={draft.baseUrl}
                  onChange={(e) => set('baseUrl', e.target.value)}
                  placeholder="https://iot.example.com"
                />
              </FormField>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Application type</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {APPLICATION_TYPES.map((t) => (
                  <OptionCard
                    key={t}
                    selected={draft.type === t}
                    title={APPLICATION_TYPE_LABEL[t]}
                    description={TYPE_HINT[t]}
                    onSelect={() => set('type', t)}
                  />
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'How should users enter this product?',
        description: 'Login through the platform gives one sign-in for every product.',
        body: (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {AUTH_MODES.map((m) => (
                <OptionCard
                  key={m}
                  selected={draft.authMode === m}
                  title={AUTH_MODE_LABEL[m]}
                  description={AUTH_HINT[m]}
                  badge={m === 'sso' ? <Badge variant="success">Recommended</Badge> : undefined}
                  onSelect={() => set('authMode', m)}
                />
              ))}
            </div>
            {draft.authMode === 'sso' ? (
              <div className="bg-surface rounded-2xl p-4">
                <p className="text-sm font-medium">Enabled automatically</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SSO_CAPABILITIES.map((f) => (
                    <span
                      key={f}
                      className="bg-card shadow-card inline-flex h-9 items-center gap-2 rounded-full pr-3 pl-1.5 text-xs font-semibold"
                    >
                      <span className="bg-success-soft text-success flex size-6 items-center justify-center rounded-full [&_svg]:size-3.5">
                        <Check />
                      </span>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Who can access this product?',
        description:
          'Access follows the organization, never a single user. Subscription pricing is set here.',
        body: (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3">
              {ACCESS_POLICIES.map((p) => (
                <OptionCard
                  key={p}
                  selected={draft.accessPolicy === p}
                  title={ACCESS_POLICY_LABEL[p]}
                  description={POLICY_HINT[p]}
                  onSelect={() => set('accessPolicy', p)}
                />
              ))}
            </div>
            {paid ? (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Pricing</p>
                  <PricingFields
                    value={draft}
                    onChange={(pricing) => setDraft((d) => ({ ...d, ...pricing }))}
                  />
                  {showErrors && errors.pricing ? (
                    <p className="text-danger mt-2 text-xs">{errors.pricing}</p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Allowed subscription status</p>
                  <div className="bg-surface grid grid-cols-2 gap-1.5 rounded-2xl p-3 sm:grid-cols-4">
                    {SUBSCRIPTION_STATUSES.map((st) => (
                      <label key={st} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={draft.allowedStatuses.includes(st)}
                          onChange={(e) => toggleStatus(st, e.target.checked)}
                        />
                        {SUBSCRIPTION_STATUS_LABEL[st]}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ),
      },
      {
        title: 'Token configuration',
        description: 'Short-lived app tokens keep revocation fast. Signing is managed for you.',
        body: (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Token lifetime">
                <Select
                  value={String(draft.tokenLifetimeMinutes)}
                  onChange={(e) => set('tokenLifetimeMinutes', Number(e.target.value))}
                >
                  {TOKEN_LIFETIMES.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Audience" hint="Defaults to the product code.">
                <Input value={audience} readOnly className="[&_input]:font-mono" />
              </FormField>
              <FormField label="Issuer">
                <Input value={ISSUER} readOnly className="[&_input]:font-mono" />
              </FormField>
              <div className="bg-surface flex items-center justify-between gap-3 rounded-2xl px-3 py-2 sm:self-end">
                <div>
                  <p className="text-sm font-medium">Signing</p>
                  <p className="text-muted text-xs">Managed automatically</p>
                </div>
                <Toggle
                  checked
                  disabled
                  onCheckedChange={() => undefined}
                  label="Signing managed automatically"
                />
              </div>
            </div>

            <div className="bg-surface-2 rounded-2xl">
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
              >
                Advanced settings
                {advanced ? (
                  <ChevronUp className="text-muted size-4" />
                ) : (
                  <ChevronDown className="text-muted size-4" />
                )}
              </button>
              {advanced ? (
                <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-2">
                  <FormField label="Custom audience" hint="Leave empty to use the product code.">
                    <Input
                      tone="nested"
                      value={draft.customAudience}
                      onChange={(e) => set('customAudience', e.target.value)}
                      placeholder={code || 'wit-iot'}
                      className="[&_input]:font-mono"
                    />
                  </FormField>
                  <FormField label="JWK endpoint">
                    <div className="bg-surface flex h-11 items-center rounded-2xl px-4">
                      <Mono className="truncate">{ISSUER}/.well-known/jwks.json</Mono>
                    </div>
                  </FormField>
                  <FormField
                    label="Custom token claims"
                    className="sm:col-span-2"
                    hint="JSON object merged into every app token."
                  >
                    <Textarea
                      tone="nested"
                      value={draft.customClaims}
                      onChange={(e) => set('customClaims', e.target.value)}
                      placeholder='{ "region": "id-jkt" }'
                      className="min-h-20 font-mono text-xs"
                    />
                  </FormField>
                  <FormField label="Key rotation">
                    <Select
                      tone="nested"
                      value={String(draft.keyRotationDays)}
                      onChange={(e) => set('keyRotationDays', Number(e.target.value))}
                    >
                      {[30, 90, 180].map((d) => (
                        <option key={d} value={d}>
                          Every {d} days
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Clock tolerance">
                    <Select
                      tone="nested"
                      value={String(draft.clockToleranceSec)}
                      onChange={(e) => set('clockToleranceSec', Number(e.target.value))}
                    >
                      {[0, 30, 60].map((s) => (
                        <option key={s} value={s}>
                          {s} seconds
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        title: 'Integrate your stack',
        description:
          'Verify the app token, then read the organization and subscription from its claims.',
        body: (
          <div className="space-y-4">
            <ChipRow>
              {STACKS.map((s) => (
                <Chip
                  key={s}
                  active={draft.stack === s}
                  activeTone="ink"
                  onClick={() => set('stack', s)}
                >
                  {SDK_STACK_LABEL[s]}
                </Chip>
              ))}
            </ChipRow>
            <Mono className="block">{snippet.install}</Mono>
            <CodeBlock title={SDK_STACK_LABEL[draft.stack]} code={snippet.code} />
            <CodeBlock
              title="Environment"
              tone="light"
              code={envSnippet(productionClientId, audience, callbackUrl)}
            />
            <p className="text-muted text-xs">
              {editing
                ? 'API clients and their secrets are managed on the product page.'
                : 'A production API client is created when you finish. Its secret is shown once.'}
            </p>
          </div>
        ),
      },
      editing
        ? {
            title: 'Review',
            description: 'Check every step, then save the product.',
            body: (
              <div className="space-y-5">
                {reviewSections.map((section, i) => (
                  <section key={section.title}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{section.title}</p>
                      <Button variant="link" size="sm" className="px-0" onClick={() => goTo(i)}>
                        Edit
                      </Button>
                    </div>
                    <KeyValue dense rows={section.rows} className="mt-1" />
                  </section>
                ))}
              </div>
            ),
          }
        : {
            title: 'Test connection',
            description: (
              <>
                Checking {draft.baseUrl || 'the platform'} with audience <Mono>{audience}</Mono>.
              </>
            ),
            body: <TestConnectionStep onComplete={setReady} />,
          },
    ]
  const current = content[step] ?? content[0]!

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <UnsavedChangesGuard when={dirty && !saved} />
      {restored.current ? (
        <Banner
          icon={<FileClock />}
          title="Draft restored."
          description="Your unfinished product setup is ready to continue."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY)
                restored.current = null
                setDraft(EMPTY)
                setStep(0)
              }}
            >
              Clear draft
            </Button>
          }
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {editing ? `Edit product · ${application.name}` : 'Set up a product'}
          </h1>
          <p className="text-muted mt-1 text-sm">
            {editing
              ? 'Change any step and save. Subscriptions keep their price snapshot.'
              : 'Six short steps. Sensible defaults are already filled in.'}
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link to={backTo}>{editing ? 'Cancel' : 'Skip'}</Link>
        </Button>
      </div>
      <Stepper steps={steps} current={step} onSelect={goTo} allowForward={editing} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {current.body}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => goTo(step - 1)} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex flex-wrap gap-2">
              {editing && step < LAST_STEP ? (
                <Button onClick={save}>
                  <Save /> Save changes
                </Button>
              ) : null}
              {step < LAST_STEP ? (
                <Button variant={editing ? 'outline' : 'primary'} onClick={next}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button onClick={save} disabled={!editing && !ready}>
                  <Check /> {editing ? 'Save product' : 'Create product'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
