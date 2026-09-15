/* Seeded, deterministic fixture generator. Run: pnpm gen:fixtures */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  AccessLog,
  AccessReason,
  ApiClient,
  Application,
  AuditLog,
  EventType,
  Invoice,
  Payment,
  PaymentChannel,
  PaymentStatus,
  Session,
  Subscription,
  SubscriptionEvent,
  SubscriptionStatus,
  Tenant,
  TenantMember,
  User,
  WebhookDelivery,
  WebhookEndpoint,
} from '../packages/types/src/index.ts'
import { buildPaymentRequest } from '../packages/fixtures/src/payments.ts'
import { buildInvoice } from '../packages/fixtures/src/invoices.ts'

export const FIXTURE_NOW = '2026-09-14T02:00:00.000Z'
const NOW = new Date(FIXTURE_NOW).getTime()
const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()
const daysAgo = (d: number) => iso(NOW - d * DAY)
const daysAhead = (d: number) => iso(NOW + d * DAY)
const hoursAgo = (h: number) => iso(NOW - h * 3_600_000)
const minutesAgo = (m: number) => iso(NOW - m * 60_000)

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260914)
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!
const between = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1))
let seq = 0
const sid = (prefix: string) => `${prefix}-${(++seq).toString(36).padStart(5, '0')}`

/* ---------- tenants & users ---------- */
const tenants: Tenant[] = [
  ['ten-alpha', 'PT Alpha Manufaktur', 'alpha', 'active', 400],
  ['ten-beta', 'PT Beta Logistik', 'beta', 'active', 260],
  ['ten-gamma', 'PT Gamma Energi', 'gamma', 'active', 310],
  ['ten-delta', 'PT Delta Retail', 'delta', 'active', 120],
  ['ten-epsilon', 'PT Epsilon Farma', 'epsilon', 'active', 90],
  ['ten-zeta', 'PT Zeta Konstruksi', 'zeta', 'suspended', 210],
  ['ten-eta', 'PT Eta Agrikultur', 'eta', 'active', 60],
  ['ten-theta', 'PT Theta Media', 'theta', 'active', 45],
  ['ten-iota', 'PT Iota Otomotif', 'iota', 'pending', 3],
  ['ten-kappa', 'PT Kappa Tekstil', 'kappa', 'active', 180],
  ['ten-lambda', 'PT Lambda Pertambangan', 'lambda', 'active', 500],
  ['ten-mu', 'PT Mu Perikanan', 'mu', 'active', 30],
].map(([id, name, code, status, age]) => ({
  id: id as string,
  name: name as string,
  code: code as string,
  status: status as Tenant['status'],
  billingEmail: `billing@${code}.co.id`,
  country: 'ID',
  createdAt: daysAgo(age as number),
  updatedAt: daysAgo(Math.min(age as number, 7)),
}))

const users: User[] = [
  ['usr-platform-admin', 'Nadia Rahma', 'admin@platform.example', true],
  ['usr-platform-ops', 'Rizal Firmansyah', 'ops@platform.example', true],
  ['usr-alpha-admin', 'Fahmi Syaban', 'alpha.admin@example.com', false],
  ['usr-alpha-operator', 'Reyza Pratama', 'alpha.operator@example.com', false],
  ['usr-beta-admin', 'Aditiya Nugraha', 'beta.admin@example.com', false],
  ['usr-beta-operator', 'Sari Wulandari', 'beta.operator@example.com', false],
  ['usr-gamma-admin', 'Bima Santoso', 'gamma.admin@example.com', false],
  ['usr-gamma-operator', 'Dewi Lestari', 'gamma.operator@example.com', false],
  ['usr-delta-admin', 'Rizky Maulana', 'delta.admin@example.com', false],
  ['usr-epsilon-admin', 'Putri Ayu', 'epsilon.admin@example.com', false],
  ['usr-zeta-admin', 'Hendra Wijaya', 'zeta.admin@example.com', false],
  ['usr-eta-admin', 'Lina Marlina', 'eta.admin@example.com', false],
  ['usr-theta-admin', 'Yusuf Hakim', 'theta.admin@example.com', false],
  ['usr-kappa-admin', 'Intan Permata', 'kappa.admin@example.com', false],
  ['usr-lambda-admin', 'Agus Setiawan', 'lambda.admin@example.com', false],
  ['usr-lambda-operator', 'Mega Sari', 'lambda.operator@example.com', false],
  ['usr-mu-admin', 'Dian Kusuma', 'mu.admin@example.com', false],
].map(([id, name, email, platformAdmin], i) => ({
  id: id as string,
  name: name as string,
  email: email as string,
  status: (i === 16 ? 'invited' : 'active') as User['status'],
  platformAdmin: platformAdmin as boolean,
  createdAt: daysAgo(between(20, 380)),
  updatedAt: daysAgo(between(0, 10)),
}))

/* ---------- applications ---------- */
const baseApp = (
  over: Partial<Application> & Pick<Application, 'id' | 'name' | 'code'>,
): Application => ({
  baseUrl: `http://localhost:4101`,
  type: 'web',
  status: 'active',
  authMode: 'sso',
  accessPolicy: 'subscription',
  allowedStatuses: ['trial', 'active', 'past_due', 'grace_period', 'cancelled'],
  tokenLifetimeMinutes: 15,
  audience: over.code,
  issuer: 'http://localhost:3200',
  callbackUrl: `${over.baseUrl ?? 'http://localhost:4101'}/auth/callback`,
  priceMonthly: 0,
  priceAnnual: 0,
  currency: 'IDR',
  trialDays: 14,
  health: 'healthy',
  lastSuccessAt: minutesAgo(18),
  lastFailure: null,
  createdAt: daysAgo(300),
  updatedAt: daysAgo(2),
  ...over,
})
const applications: Application[] = [
  baseApp({
    id: 'app-iot',
    name: 'WIT IoT Platform',
    code: 'iot-demo',
    baseUrl: 'http://localhost:4101',
    callbackUrl: 'http://localhost:4101/auth/callback',
    priceMonthly: 1_500_000,
    priceAnnual: 15_000_000,
  }),
  baseApp({
    id: 'app-iot-mobile',
    name: 'IoT Mobile',
    code: 'iot-mobile',
    type: 'mobile',
    baseUrl: 'iotmobile://app',
    callbackUrl: 'iotmobile://auth/callback',
    tokenLifetimeMinutes: 10,
    priceMonthly: 300_000,
    priceAnnual: 3_000_000,
  }),
  baseApp({
    id: 'app-iot-api',
    name: 'IoT API',
    code: 'iot-api',
    type: 'backend',
    authMode: 'service_only',
    baseUrl: 'http://localhost:4111',
    callbackUrl: '',
    tokenLifetimeMinutes: 5,
    priceMonthly: 500_000,
    priceAnnual: 5_000_000,
    trialDays: 0,
  }),
  baseApp({
    id: 'app-erp',
    name: 'ERP System',
    code: 'erp-demo',
    baseUrl: 'http://localhost:4102',
    callbackUrl: 'http://localhost:4102/auth/callback',
    priceMonthly: 2_000_000,
    priceAnnual: 20_000_000,
    createdAt: daysAgo(240),
  }),
  baseApp({
    id: 'app-crm',
    name: 'CRM Platform',
    code: 'crm-demo',
    baseUrl: 'http://localhost:4103',
    callbackUrl: 'http://localhost:4103/auth/callback',
    priceMonthly: 900_000,
    priceAnnual: 9_000_000,
    health: 'degraded',
    lastSuccessAt: hoursAgo(6),
    lastFailure: '500 Internal Server Error',
    createdAt: daysAgo(150),
  }),
  baseApp({
    id: 'app-helpdesk',
    name: 'Helpdesk',
    code: 'helpdesk',
    baseUrl: 'http://localhost:4104',
    accessPolicy: 'free',
    callbackUrl: 'http://localhost:4104/auth/callback',
    trialDays: 0,
    createdAt: daysAgo(40),
  }),
  baseApp({
    id: 'app-legacy',
    name: 'Legacy Reporting',
    code: 'legacy-report',
    type: 'external',
    authMode: 'own_login',
    status: 'disabled',
    baseUrl: 'https://reports.example.com',
    accessPolicy: 'manual',
    callbackUrl: '',
    trialDays: 0,
    health: 'offline',
    lastSuccessAt: daysAgo(12),
    lastFailure: 'Connection timed out',
    createdAt: daysAgo(500),
  }),
]

/* ---------- subscriptions ---------- */
interface SubSeed {
  id: string
  tenantId: string
  applicationId: string
  period: 'monthly' | 'annual'
  status: SubscriptionStatus
  started: number
  graceEnd?: number
  cancelAtEnd?: boolean
}
const subSeeds: SubSeed[] = [
  {
    id: 'sub-alpha-iot',
    tenantId: 'ten-alpha',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'active',
    started: 256,
  },
  {
    id: 'sub-alpha-iot-mobile',
    tenantId: 'ten-alpha',
    applicationId: 'app-iot-mobile',
    period: 'monthly',
    status: 'active',
    started: 120,
  },
  {
    id: 'sub-alpha-erp',
    tenantId: 'ten-alpha',
    applicationId: 'app-erp',
    period: 'annual',
    status: 'active',
    started: 200,
  },
  {
    id: 'sub-beta-iot',
    tenantId: 'ten-beta',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'grace_period',
    started: 380,
    graceEnd: 23,
  },
  {
    id: 'sub-beta-crm',
    tenantId: 'ten-beta',
    applicationId: 'app-crm',
    period: 'monthly',
    status: 'active',
    started: 40,
  },
  {
    id: 'sub-gamma-iot',
    tenantId: 'ten-gamma',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'suspended',
    started: 410,
  },
  {
    id: 'sub-gamma-erp',
    tenantId: 'ten-gamma',
    applicationId: 'app-erp',
    period: 'annual',
    status: 'active',
    started: 300,
  },
  {
    id: 'sub-delta-iot',
    tenantId: 'ten-delta',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'active',
    started: 100,
  },
  {
    id: 'sub-delta-crm',
    tenantId: 'ten-delta',
    applicationId: 'app-crm',
    period: 'annual',
    status: 'past_due',
    started: 370,
  },
  {
    id: 'sub-epsilon-erp',
    tenantId: 'ten-epsilon',
    applicationId: 'app-erp',
    period: 'monthly',
    status: 'trial',
    started: 6,
  },
  {
    id: 'sub-zeta-iot',
    tenantId: 'ten-zeta',
    applicationId: 'app-iot',
    period: 'monthly',
    status: 'expired',
    started: 210,
  },
  {
    id: 'sub-eta-iot',
    tenantId: 'ten-eta',
    applicationId: 'app-iot',
    period: 'monthly',
    status: 'active',
    started: 55,
  },
  {
    id: 'sub-theta-crm',
    tenantId: 'ten-theta',
    applicationId: 'app-crm',
    period: 'monthly',
    status: 'cancelled',
    started: 44,
    cancelAtEnd: true,
  },
  {
    id: 'sub-iota-iot',
    tenantId: 'ten-iota',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'draft',
    started: 0,
  },
  {
    id: 'sub-kappa-erp',
    tenantId: 'ten-kappa',
    applicationId: 'app-erp',
    period: 'annual',
    status: 'active',
    started: 170,
  },
  {
    id: 'sub-kappa-iot',
    tenantId: 'ten-kappa',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'past_due',
    started: 365,
  },
  {
    id: 'sub-lambda-iot',
    tenantId: 'ten-lambda',
    applicationId: 'app-iot',
    period: 'annual',
    status: 'active',
    started: 480,
  },
  {
    id: 'sub-lambda-iot-api',
    tenantId: 'ten-lambda',
    applicationId: 'app-iot-api',
    period: 'annual',
    status: 'active',
    started: 400,
  },
  {
    id: 'sub-lambda-erp',
    tenantId: 'ten-lambda',
    applicationId: 'app-erp',
    period: 'annual',
    status: 'active',
    started: 470,
  },
  {
    id: 'sub-lambda-crm',
    tenantId: 'ten-lambda',
    applicationId: 'app-crm',
    period: 'annual',
    status: 'active',
    started: 200,
  },
  {
    id: 'sub-mu-crm',
    tenantId: 'ten-mu',
    applicationId: 'app-crm',
    period: 'monthly',
    status: 'trial',
    started: 3,
  },
]
const appById = new Map(applications.map((a) => [a.id, a]))
const subscriptions: Subscription[] = subSeeds.map((s) => {
  const app = appById.get(s.applicationId)!
  const periodDays = s.period === 'annual' ? 365 : 30
  const periodsElapsed = Math.floor(s.started / periodDays)
  const periodStart = s.started - periodsElapsed * periodDays
  const inTrial = s.status === 'trial'
  return {
    id: s.id,
    tenantId: s.tenantId,
    applicationId: s.applicationId,
    billingPeriod: s.period,
    price: s.period === 'annual' ? app.priceAnnual : app.priceMonthly,
    currency: app.currency,
    status: s.status,
    startedAt: daysAgo(s.started),
    currentPeriodStart: daysAgo(inTrial ? s.started : periodStart),
    currentPeriodEnd: inTrial
      ? daysAhead(app.trialDays - s.started)
      : daysAhead(periodDays - periodStart),
    gracePeriodEnd: s.graceEnd ? daysAhead(s.graceEnd) : null,
    cancelAtPeriodEnd: s.cancelAtEnd ?? false,
    createdAt: daysAgo(s.started + 1),
    updatedAt: daysAgo(between(0, 5)),
  }
})

const subscriptionEvents: SubscriptionEvent[] = []
const pushEvent = (
  subscriptionId: string,
  at: string,
  type: EventType,
  label: string,
  note: string | null = null,
) => subscriptionEvents.push({ id: sid('sev'), subscriptionId, at, type, label, note })
for (const s of subSeeds) {
  pushEvent(s.id, daysAgo(s.started + 1), 'subscription.created', 'Subscription created')
  if (s.status !== 'draft')
    pushEvent(
      s.id,
      daysAgo(s.started),
      'subscription.activated',
      s.status === 'trial' ? 'Trial started' : 'Subscription started',
    )
  if (s.id === 'sub-beta-iot') {
    pushEvent(s.id, daysAgo(24), 'subscription.renewed', 'Renewal invoice created', 'INV-2026-1092')
    pushEvent(
      s.id,
      daysAgo(12),
      'subscription.past_due',
      'Payment due',
      'Rp 12.000.000 outstanding',
    )
    pushEvent(
      s.id,
      daysAgo(7),
      'subscription.grace_started',
      'Grace period started',
      'Access remains until 7 Oct 2026',
    )
  }
  if (s.id === 'sub-gamma-iot') {
    pushEvent(s.id, daysAgo(45), 'subscription.renewed', 'Renewal invoice created', 'INV-2026-1044')
    pushEvent(s.id, daysAgo(30), 'subscription.past_due', 'Payment due')
    pushEvent(s.id, daysAgo(22), 'subscription.grace_started', 'Grace period started')
    pushEvent(
      s.id,
      daysAgo(8),
      'subscription.suspended',
      'Subscription suspended',
      'Outstanding payment',
    )
  }
  if (s.status === 'past_due') pushEvent(s.id, daysAgo(4), 'subscription.past_due', 'Payment due')
  if (s.status === 'expired')
    pushEvent(s.id, daysAgo(15), 'subscription.expired', 'Subscription expired')
  if (s.status === 'cancelled')
    pushEvent(
      s.id,
      daysAgo(3),
      'subscription.cancelled',
      'Cancellation scheduled',
      'Access continues until period end',
    )
}

/* ---------- members ---------- */
const memberSeeds: [string, string, TenantMember['workspaceRole'], string[]][] = [
  [
    'ten-alpha',
    'usr-alpha-admin',
    'workspace_admin',
    ['app-iot', 'app-iot-mobile', 'app-erp', 'app-helpdesk'],
  ],
  ['ten-alpha', 'usr-alpha-operator', 'member', ['app-iot', 'app-helpdesk']],
  ['ten-beta', 'usr-beta-admin', 'workspace_admin', ['app-iot', 'app-crm', 'app-helpdesk']],
  ['ten-beta', 'usr-beta-operator', 'member', ['app-iot']],
  ['ten-gamma', 'usr-gamma-admin', 'workspace_admin', ['app-iot', 'app-erp', 'app-helpdesk']],
  ['ten-gamma', 'usr-gamma-operator', 'member', ['app-erp']],
  ['ten-delta', 'usr-delta-admin', 'workspace_admin', ['app-iot', 'app-crm']],
  ['ten-epsilon', 'usr-epsilon-admin', 'workspace_admin', ['app-erp']],
  ['ten-zeta', 'usr-zeta-admin', 'workspace_admin', ['app-iot']],
  ['ten-eta', 'usr-eta-admin', 'workspace_admin', ['app-iot']],
  ['ten-theta', 'usr-theta-admin', 'workspace_admin', ['app-crm']],
  ['ten-kappa', 'usr-kappa-admin', 'workspace_admin', ['app-erp', 'app-iot']],
  ['ten-lambda', 'usr-lambda-admin', 'workspace_admin', ['app-iot', 'app-erp', 'app-crm']],
  ['ten-lambda', 'usr-lambda-operator', 'member', ['app-iot', 'app-crm']],
  ['ten-mu', 'usr-mu-admin', 'workspace_admin', ['app-crm']],
]
const members: TenantMember[] = memberSeeds.map(
  ([tenantId, userId, workspaceRole, applicationIds]) => ({
    id: `mem-${tenantId.slice(4)}-${userId.slice(4)}`,
    tenantId,
    userId,
    workspaceRole,
    status: userId === 'usr-mu-admin' ? 'invited' : 'active',
    applicationIds,
  }),
)

/* ---------- api clients & webhooks ---------- */
const apiClients: ApiClient[] = [
  [
    'cli-iot-dev',
    'app-iot',
    'development',
    'IoT Development',
    'iot_demo_dev_3f9a',
    'k2Qx',
    120,
    null,
  ],
  ['cli-iot-stg', 'app-iot', 'staging', 'IoT Staging', 'iot_demo_stg_81bc', 'mP0e', 120, 30],
  [
    'cli-iot-prod',
    'app-iot',
    'production',
    'IoT Production',
    'iot_demo_prod_5c21',
    'Xa7L',
    118,
    12,
  ],
  [
    'cli-iot-api-prod',
    'app-iot-api',
    'production',
    'IoT API Production',
    'iot_api_prod_09ee',
    'qR4t',
    90,
    null,
  ],
  [
    'cli-erp-prod',
    'app-erp',
    'production',
    'ERP Production',
    'erp_demo_prod_77d0',
    'Zz1n',
    200,
    60,
  ],
  [
    'cli-crm-prod',
    'app-crm',
    'production',
    'CRM Production',
    'crm_demo_prod_a4f2',
    'Hs9v',
    140,
    null,
  ],
  [
    'cli-crm-stg',
    'app-crm',
    'staging',
    'CRM Staging (revoked)',
    'crm_demo_stg_c0de',
    'Nn3b',
    140,
    null,
  ],
].map(([id, applicationId, environment, name, clientId, secretHint, age, rotated]) => ({
  id: id as string,
  applicationId: applicationId as string,
  environment: environment as ApiClient['environment'],
  name: name as string,
  clientId: clientId as string,
  secretHint: secretHint as string,
  status: (id === 'cli-crm-stg' ? 'revoked' : 'active') as ApiClient['status'],
  allowedRedirectUris: [applications.find((a) => a.id === applicationId)?.callbackUrl ?? ''].filter(
    Boolean,
  ),
  allowedScopes: ['access:exchange', 'subscriptions:read', 'usage:report'],
  createdAt: daysAgo(age as number),
  rotatedAt: rotated === null ? null : daysAgo(rotated as number),
}))

const webhooks: WebhookEndpoint[] = [
  {
    id: 'whk-iot',
    applicationId: 'app-iot',
    url: 'http://localhost:4300/webhooks/saas',
    events: [
      'subscription.activated',
      'subscription.updated',
      'subscription.suspended',
      'subscription.expired',
      'payment.success',
    ],
    status: 'active',
    secretHint: 'a91f',
    createdAt: daysAgo(118),
  },
  {
    id: 'whk-erp',
    applicationId: 'app-erp',
    url: 'http://localhost:4102/webhooks/saas',
    events: [
      'subscription.activated',
      'subscription.updated',
      'subscription.suspended',
      'subscription.renewed',
    ],
    status: 'active',
    secretHint: '7c2e',
    createdAt: daysAgo(200),
  },
  {
    id: 'whk-crm',
    applicationId: 'app-crm',
    url: 'https://crm.example.com/webhook',
    events: [
      'subscription.activated',
      'subscription.updated',
      'subscription.suspended',
      'subscription.expired',
    ],
    status: 'active',
    secretHint: 'e04b',
    createdAt: daysAgo(140),
  },
]
const deliveries: WebhookDelivery[] = []
const deliveryEvents: EventType[] = [
  'subscription.updated',
  'subscription.activated',
  'subscription.renewed',
  'payment.success',
  'subscription.suspended',
]
for (let i = 0; i < 36; i += 1) {
  const endpoint = pick(webhooks)
  const event = pick(deliveryEvents.filter((e) => endpoint.events.includes(e)))
  const failing = endpoint.id === 'whk-crm' && i % 3 !== 0
  const tenant = pick(tenants.slice(0, 5))
  const at = minutesAgo(between(2, 60 * 48))
  deliveries.push({
    id: sid('dlv'),
    endpointId: endpoint.id,
    event,
    status: failing ? (i % 2 === 0 ? 'retrying' : 'failed') : 'success',
    httpStatus: failing ? 500 : 200,
    latencyMs: failing ? between(900, 3000) : between(80, 260),
    attempt: failing ? between(1, 5) : 1,
    maxAttempts: 5,
    at,
    payload: JSON.stringify(
      {
        id: `evt_${i.toString(36)}`,
        type: event,
        created_at: at,
        data: {
          tenant_id: tenant.id,
          application: pick(['iot-demo', 'erp-demo', 'crm-demo']),
          status: 'active',
        },
      },
      null,
      2,
    ),
    response: failing ? '{"error":"Internal Server Error"}' : '{"ok":true}',
  })
}
deliveries.sort((a, b) => b.at.localeCompare(a.at))

/* ---------- invoices & payments ---------- */
const invoices: Invoice[] = []
const payments: Payment[] = []
const CHANNELS: PaymentChannel[] = [
  'BCA',
  'BNI',
  'MANDIRI',
  'BRI',
  'OVO',
  'DANA',
  'QRIS',
  'CARD',
  'ALFAMART',
]
function makePayment(
  invoice: Invoice,
  id: string,
  status: PaymentStatus,
  createdAt: string,
  paidAt: string | null,
): Payment {
  const p = buildPaymentRequest(invoice, pick(CHANNELS), id, createdAt)
  if (status === 'pending') return p
  const at = paidAt ?? iso(new Date(createdAt).getTime() + 2 * 3_600_000)
  const eventType = status === 'success' ? 'paid' : status
  return {
    ...p,
    status,
    paidAt: status === 'success' || status === 'refunded' ? at : null,
    events: [
      ...p.events,
      {
        at,
        type: 'callback',
        note: `status ${status === 'success' ? 'PAID' : status.toUpperCase()}`,
      },
      { at, type: eventType, note: null },
    ],
  }
}
let invoiceNo = 1080
for (const s of subscriptions) {
  if (s.status === 'draft') continue
  const app = appById.get(s.applicationId)!
  const number =
    s.id === 'sub-beta-iot'
      ? 'INV-2026-1092'
      : s.id === 'sub-gamma-iot'
        ? 'INV-2026-1044'
        : `INV-2026-${invoiceNo++}`
  const id = `inv-${s.id.slice(4)}`
  if (s.status === 'active' || s.status === 'cancelled') {
    const paidAt = iso(new Date(s.currentPeriodStart).getTime() + between(1, 10) * DAY)
    invoices.push(
      buildInvoice(s, app, {
        id,
        number,
        periodStart: s.currentPeriodStart,
        issuedAt: s.currentPeriodStart,
        status: 'paid',
        paidAt,
      }),
    )
    payments.push(
      makePayment(
        invoices[invoices.length - 1]!,
        `pay-${s.id.slice(4)}`,
        'success',
        iso(new Date(paidAt).getTime() - 3_600_000),
        paidAt,
      ),
    )
  } else if (s.status === 'trial') {
    invoices.push(
      buildInvoice(s, app, {
        id,
        number,
        periodStart: s.currentPeriodEnd,
        issuedAt: s.currentPeriodEnd,
        status: 'draft',
      }),
    )
  } else {
    const overdue = s.status !== 'past_due'
    const issued =
      s.id === 'sub-beta-iot' ? daysAgo(24) : s.id === 'sub-gamma-iot' ? daysAgo(45) : daysAgo(18)
    invoices.push(
      buildInvoice(s, app, {
        id,
        number,
        periodStart: s.currentPeriodStart,
        issuedAt: issued,
        status: overdue ? 'overdue' : 'open',
      }),
    )
    const due = invoices[invoices.length - 1]!.dueDate
    payments.push(
      makePayment(
        invoices[invoices.length - 1]!,
        `pay-${s.id.slice(4)}`,
        s.status === 'suspended' ? 'failed' : s.status === 'expired' ? 'expired' : 'pending',
        iso(new Date(due).getTime() - 2 * DAY),
        null,
      ),
    )
  }
}
for (let i = 0; i < 6; i += 1) {
  const s = pick(subscriptions.filter((x) => x.status === 'active'))
  const at = daysAgo(between(30, 300))
  const app = appById.get(s.applicationId)!
  invoices.push(
    buildInvoice(s, app, {
      id: `inv-hist-${i}`,
      number: `INV-2025-${900 + i}`,
      periodStart: at,
      issuedAt: at,
      status: 'paid',
      paidAt: iso(new Date(at).getTime() + 3 * DAY),
    }),
  )
  payments.push(
    makePayment(
      invoices[invoices.length - 1]!,
      `pay-hist-${i}`,
      i === 4 ? 'refunded' : 'success',
      iso(new Date(at).getTime() + 2 * DAY),
      iso(new Date(at).getTime() + 3 * DAY),
    ),
  )
}
invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/* ---------- access logs ---------- */
const accessLogs: AccessLog[] = []
const denyReasons: AccessReason[] = [
  'NO_SUBSCRIPTION',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_EXPIRED',
  'USER_NOT_ASSIGNED',
  'TENANT_SUSPENDED',
  'APPLICATION_DISABLED',
]
for (let i = 0; i < 260; i += 1) {
  const m = pick(members)
  const appId = pick(m.applicationIds.length ? m.applicationIds : ['app-iot'])
  const app = applications.find((a) => a.id === appId)!
  const sub =
    subscriptions.find((s) => s.tenantId === m.tenantId && s.applicationId === app.id) ?? null
  const status = sub?.status
  let decision: AccessLog['decision'] = 'allow'
  let reason: AccessReason = 'OK'
  let warning: AccessReason | null = null
  if (app.accessPolicy === 'subscription') {
    if (!sub) {
      decision = 'deny'
      reason = 'NO_SUBSCRIPTION'
    } else if (status === 'suspended') {
      decision = 'deny'
      reason = 'SUBSCRIPTION_SUSPENDED'
    } else if (status === 'expired') {
      decision = 'deny'
      reason = 'SUBSCRIPTION_EXPIRED'
    } else if (status === 'draft') {
      decision = 'deny'
      reason = 'SUBSCRIPTION_DRAFT'
    } else if (status === 'grace_period' || status === 'past_due') {
      warning = 'PAYMENT_REQUIRED'
    }
  }
  if (decision === 'allow' && rnd() < 0.04) {
    decision = 'deny'
    reason = pick(denyReasons)
  }
  accessLogs.push({
    id: sid('acc'),
    requestId: `req_${between(100000, 999999).toString(36)}${i.toString(36)}`,
    at: minutesAgo(between(1, 60 * 30)),
    tenantId: m.tenantId,
    userId: m.userId,
    applicationId: appId,
    subscriptionId: sub?.id ?? null,
    decision,
    reason,
    warning,
    latencyMs: between(8, 64),
  })
}
accessLogs.sort((a, b) => b.at.localeCompare(a.at))

/* ---------- audit ---------- */
const auditLogs: AuditLog[] = []
const audit = (a: Omit<AuditLog, 'id' | 'sourceIp'>) =>
  auditLogs.push({ id: sid('aud'), sourceIp: `10.0.${between(0, 9)}.${between(2, 250)}`, ...a })
const platform = users[0]!
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: 'ten-gamma',
  action: 'subscription.changed',
  resourceType: 'subscription',
  resourceId: 'sub-gamma-iot',
  before: { status: 'grace_period' },
  after: { status: 'suspended' },
  requestId: 'req_9x1kd0',
  at: daysAgo(8),
})
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: null,
  action: 'api_client.rotated',
  resourceType: 'api_client',
  resourceId: 'cli-iot-prod',
  before: { secretHint: 'Q1mv' },
  after: { secretHint: 'Xa7L' },
  requestId: 'req_0c9f2a',
  at: daysAgo(12),
})
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: null,
  action: 'api_client.revoked',
  resourceType: 'api_client',
  resourceId: 'cli-crm-stg',
  before: { status: 'active' },
  after: { status: 'revoked' },
  requestId: 'req_11de77',
  at: daysAgo(3),
})
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: 'ten-iota',
  action: 'tenant.created',
  resourceType: 'tenant',
  resourceId: 'ten-iota',
  before: null,
  after: { name: 'PT Iota Otomotif', status: 'pending' },
  requestId: 'req_44aa10',
  at: daysAgo(3),
})
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: 'ten-zeta',
  action: 'tenant.suspended',
  resourceType: 'tenant',
  resourceId: 'ten-zeta',
  before: { status: 'active' },
  after: { status: 'suspended' },
  requestId: 'req_5fe0b3',
  at: daysAgo(15),
})
audit({
  actorId: platform.id,
  actorName: platform.name,
  tenantId: null,
  action: 'webhook.created',
  resourceType: 'webhook',
  resourceId: 'whk-iot',
  before: null,
  after: { url: 'http://localhost:4300/webhooks/saas' },
  requestId: 'req_71cc02',
  at: daysAgo(118),
})
for (const log of accessLogs.slice(0, 40)) {
  const u = users.find((x) => x.id === log.userId)!
  audit({
    actorId: u.id,
    actorName: u.name,
    tenantId: log.tenantId,
    action: log.decision === 'allow' ? 'access.allowed' : 'access.denied',
    resourceType: 'application',
    resourceId: log.applicationId,
    before: null,
    after: { reason: log.reason, decision: log.decision },
    requestId: log.requestId,
    at: log.at,
  })
}
for (const m of members.slice(0, 8)) {
  const u = users.find((x) => x.id === m.userId)!
  audit({
    actorId: u.id,
    actorName: u.name,
    tenantId: m.tenantId,
    action: 'user.login',
    resourceType: 'session',
    resourceId: `ses-${m.userId.slice(4)}`,
    before: null,
    after: { method: 'password' },
    requestId: `req_login${between(100, 999)}`,
    at: hoursAgo(between(1, 40)),
  })
}
auditLogs.sort((a, b) => b.at.localeCompare(a.at))

/* ---------- sessions ---------- */
const sessions: Session[] = members.slice(0, 9).map((m) => {
  const created = hoursAgo(between(1, 20))
  return {
    id: `ses-${m.userId.slice(4)}`,
    userId: m.userId,
    tenantId: m.tenantId,
    createdAt: created,
    expiresAt: iso(new Date(created).getTime() + 24 * 3_600_000),
    lastSeenAt: minutesAgo(between(1, 120)),
    ip: `103.${between(10, 250)}.${between(0, 255)}.${between(2, 250)}`,
    userAgent: pick([
      'Chrome 129 · macOS',
      'Safari 18 · iOS',
      'Edge 129 · Windows',
      'Chrome 129 · Android',
    ]),
    revoked: m.userId === 'usr-zeta-admin',
  }
})

/* ---------- write ---------- */
const out = join(process.cwd(), 'packages/fixtures/data')
mkdirSync(out, { recursive: true })
const write = (name: string, data: unknown) =>
  writeFileSync(join(out, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
write('meta', { now: FIXTURE_NOW })
write('tenants', tenants)
write('users', users)
write('members', members)
write('applications', applications)
write('subscriptions', subscriptions)
write('subscription-events', subscriptionEvents)
write('api-clients', apiClients)
write('webhooks', webhooks)
write('deliveries', deliveries)
write('invoices', invoices)
write('payments', payments)
write('access-logs', accessLogs)
write('audit-logs', auditLogs)
write('sessions', sessions)
console.log(`fixtures written to ${out}`)
