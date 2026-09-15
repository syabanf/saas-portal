import { fmtDate } from '@scp/fixtures'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  FormField,
  PageHeader,
  StatCard,
  Timeline,
  ToggleRow,
} from '@scp/ui'
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Mono } from '../../components/badges'

const STORAGE_KEY = 'scp.admin.security'

function numberOptions(values: number[], unit: string) {
  return values.map((v) => ({ value: String(v), label: `${v} ${unit}` }))
}
const TTL_OPTIONS = {
  session: numberOptions([8, 12, 24], 'h'),
  accessToken: numberOptions([15, 30], 'min'),
  appToken: numberOptions([5, 10, 15], 'min'),
  code: numberOptions([30, 60], 's, single-use'),
}

const BASELINE: { key: string; title: string; description: string; defaultOn: boolean }[] = [
  {
    key: 'asymmetric_jwt',
    title: 'Asymmetric JWT signing',
    description: 'RS256 or ES256; applications verify with the public key only.',
    defaultOn: true,
  },
  {
    key: 'jwk_endpoint',
    title: 'JWK endpoint',
    description: 'Public keys served at /.well-known/jwks.json.',
    defaultOn: true,
  },
  {
    key: 'key_rotation',
    title: 'Key rotation',
    description: 'New kid per rotation; old keys stay verifiable until retired.',
    defaultOn: true,
  },
  {
    key: 'short_tokens',
    title: 'Short-lived access tokens',
    description: 'App tokens expire in minutes so subscription changes apply fast.',
    defaultOn: true,
  },
  {
    key: 'hashed_secrets',
    title: 'Hashed client secrets',
    description: 'Stored with argon2; never retrievable after creation.',
    defaultOn: true,
  },
  {
    key: 'one_time_secret',
    title: 'One-time secret display',
    description: 'The secret is shown once, then only its last four characters.',
    defaultOn: true,
  },
  {
    key: 'separate_prod',
    title: 'Separate production credentials',
    description: 'Development, staging and production never share a client.',
    defaultOn: true,
  },
  {
    key: 'redirect_allowlist',
    title: 'Redirect URI allowlist',
    description: 'Authorization codes go only to registered callbacks.',
    defaultOn: true,
  },
  {
    key: 'csrf',
    title: 'CSRF protection',
    description: 'State parameter on every browser redirect.',
    defaultOn: true,
  },
  {
    key: 'pkce',
    title: 'PKCE for browser and mobile flows',
    description: 'Code verifier required for public clients.',
    defaultOn: true,
  },
  {
    key: 'webhook_signature',
    title: 'Webhook signature',
    description: 'HMAC over timestamp and body in X-Signature.',
    defaultOn: true,
  },
  {
    key: 'replay_protection',
    title: 'Replay protection',
    description: 'Deliveries older than the 5 min window are rejected.',
    defaultOn: true,
  },
  {
    key: 'rate_limiting',
    title: 'Rate limiting',
    description: 'Per client id on token and exchange endpoints.',
    defaultOn: true,
  },
  {
    key: 'session_revocation',
    title: 'Session revocation',
    description: 'Revoked sessions fail the next exchange immediately.',
    defaultOn: true,
  },
  {
    key: 'reauth',
    title: 'Re-authentication for sensitive actions',
    description: 'Ask for the password again before rotating keys or revoking access.',
    defaultOn: false,
  },
]

interface Ttl {
  session: number
  accessToken: number
  appToken: number
  code: number
}

interface SigningKey {
  kid: string
  createdAt: string
  active: boolean
}

interface SecurityState {
  baseline: Record<string, boolean>
  ttl: Ttl
  keys: SigningKey[]
}

const DEFAULT_STATE: SecurityState = {
  baseline: Object.fromEntries(BASELINE.map((b) => [b.key, b.defaultOn])),
  ttl: { session: 24, accessToken: 30, appToken: 15, code: 60 },
  keys: [
    { kid: 'demo-2026-09', createdAt: '2026-09-01T00:00:00.000Z', active: true },
    { kid: 'demo-2026-06', createdAt: '2026-06-01T00:00:00.000Z', active: false },
  ],
}

function load(): SecurityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<SecurityState>
    return {
      baseline: { ...DEFAULT_STATE.baseline, ...(parsed.baseline ?? {}) },
      ttl: { ...DEFAULT_STATE.ttl, ...(parsed.ttl ?? {}) },
      keys: parsed.keys && parsed.keys.length > 0 ? parsed.keys : DEFAULT_STATE.keys,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function nextKid(keys: SigningKey[], now: Date): string {
  const prefix = `demo-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const siblings = keys.filter((k) => k.kid.startsWith(prefix)).length
  return siblings === 0 ? prefix : `${prefix}-${String.fromCharCode(96 + siblings)}`
}

const TOKEN_TIMELINE = [
  {
    id: 'issued',
    when: '10:00',
    title: 'App token issued',
    note: 'Subscription active',
    tone: 'success' as const,
  },
  {
    id: 'suspended',
    when: '10:05',
    title: 'Subscription suspended',
    note: 'Payment overdue',
    tone: 'warning' as const,
  },
  {
    id: 'expired',
    when: '10:10',
    title: 'App token expired',
    note: 'Short lifetime reached',
    tone: 'default' as const,
  },
  {
    id: 'denied',
    when: '10:10',
    title: 'Re-exchange denied',
    note: 'Access broker checks the subscription again',
    tone: 'accent' as const,
  },
]

export function SecurityPage() {
  const [security, setSecurity] = React.useState<SecurityState>(load)
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(security))
    } catch {
      /* storage unavailable; keep in memory */
    }
  }, [security])

  const enabled = BASELINE.filter((b) => security.baseline[b.key]).length

  function setTtl<K extends keyof Ttl>(key: K, value: number) {
    setSecurity((s) => ({ ...s, ttl: { ...s.ttl, [key]: value } }))
  }

  function rotateKey() {
    const now = new Date()
    setSecurity((s) => ({
      ...s,
      keys: [
        { kid: nextKid(s.keys, now), createdAt: now.toISOString(), active: true },
        ...s.keys.map((k) => ({ ...k, active: false })),
      ],
    }))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Security"
        description="Baseline controls, token lifetimes and signing keys for the platform."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Baseline score"
          value={`${enabled} / ${BASELINE.length}`}
          hint={
            enabled === BASELINE.length
              ? 'Every control enabled'
              : `${BASELINE.length - enabled} to enable`
          }
          icon={<ShieldCheck />}
          tone={enabled === BASELINE.length ? 'success' : 'warning'}
        />
        <StatCard
          label="App token lifetime"
          value={`${security.ttl.appToken} min`}
          hint="Bounded exposure after suspension"
          icon={<RefreshCw />}
          tone="info"
        />
        <StatCard
          label="Active signing key"
          value={
            <code className="font-mono text-base">
              {security.keys.find((k) => k.active)?.kid ?? 'none'}
            </code>
          }
          hint={`${security.keys.length} keys known`}
          icon={<KeyRound />}
          tone="ink"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Security baseline</CardTitle>
            <CardDescription>
              Minimum controls from the platform blueprint. Stored locally for this console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {BASELINE.map((b) => (
              <ToggleRow
                key={b.key}
                title={b.title}
                description={b.description}
                checked={Boolean(security.baseline[b.key])}
                onCheckedChange={(on) =>
                  setSecurity((s) => ({ ...s, baseline: { ...s.baseline, [b.key]: on } }))
                }
              />
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token lifetime</CardTitle>
              <CardDescription>
                App tokens stay short on purpose. A suspended subscription must lock the user out
                within minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="SaaS session" htmlFor="ttl-session">
                  <Combobox
                    id="ttl-session"
                    tone="nested"
                    value={String(security.ttl.session)}
                    onChange={(v) => setTtl('session', Number(v))}
                    options={TTL_OPTIONS.session}
                    searchPlaceholder="Search…"
                  />
                </FormField>
                <FormField label="SaaS access token" htmlFor="ttl-accessToken">
                  <Combobox
                    id="ttl-accessToken"
                    tone="nested"
                    value={String(security.ttl.accessToken)}
                    onChange={(v) => setTtl('accessToken', Number(v))}
                    options={TTL_OPTIONS.accessToken}
                    searchPlaceholder="Search…"
                  />
                </FormField>
                <FormField label="App access token" htmlFor="ttl-appToken">
                  <Combobox
                    id="ttl-appToken"
                    tone="nested"
                    value={String(security.ttl.appToken)}
                    onChange={(v) => setTtl('appToken', Number(v))}
                    options={TTL_OPTIONS.appToken}
                    searchPlaceholder="Search…"
                  />
                </FormField>
                <FormField label="Authorization code" htmlFor="ttl-code">
                  <Combobox
                    id="ttl-code"
                    tone="nested"
                    value={String(security.ttl.code)}
                    onChange={(v) => setTtl('code', Number(v))}
                    options={TTL_OPTIONS.code}
                    searchPlaceholder="Search…"
                  />
                </FormField>
              </div>
              <div className="bg-surface-2 rounded-2xl p-4">
                <p className="text-muted mb-2 text-xs">
                  Why short-lived app tokens matter. Without them a user keeps access long after the
                  subscription is revoked.
                </p>
                <Timeline items={TOKEN_TIMELINE} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Signing keys</CardTitle>
                <CardDescription>
                  The active kid signs new tokens. Retired keys still verify until removed from the
                  JWK set.
                </CardDescription>
              </div>
              <Button size="sm" onClick={rotateKey}>
                <RefreshCw />
                Rotate key
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {security.keys.map((k) => (
                <div
                  key={k.kid}
                  className="bg-surface-2 flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5"
                >
                  <KeyRound className="text-muted size-4" />
                  <Mono className="flex-1">{k.kid}</Mono>
                  <span className="text-muted text-xs">Created {fmtDate(k.createdAt)}</span>
                  <Badge variant={k.active ? 'success' : 'muted'} dot>
                    {k.active ? 'Active' : 'Retired'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
