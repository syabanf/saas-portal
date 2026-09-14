import { fmtIdr } from '@scp/fixtures'
import type {
  AccessPolicyMode,
  Application,
  ApplicationType,
  AuthMode,
  SubscriptionStatus,
} from '@scp/types'
import { FormField, Input } from '@scp/ui'

export const ISSUER = 'http://localhost:3200'
export const APPLICATION_TYPES: ApplicationType[] = ['web', 'mobile', 'backend', 'external']
export const AUTH_MODES: AuthMode[] = ['sso', 'own_login', 'service_only']
export const ACCESS_POLICIES: AccessPolicyMode[] = ['subscription', 'free', 'manual']
export const TOKEN_LIFETIMES = [5, 10, 15, 30]
/** Statuses that keep the door open by default (blueprint §33 step 3). */
export const DEFAULT_ALLOWED_STATUSES: SubscriptionStatus[] = [
  'trial',
  'active',
  'past_due',
  'grace_period',
]

export function callbackUrlFor(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return base === '' ? '' : `${base}/auth/callback`
}

/** One-line price summary: paid periods only, or the policy when nothing is billed. */
export function pricingLine(app: Application): string {
  if (app.accessPolicy === 'free') return 'Free'
  if (app.accessPolicy === 'manual') return 'Manual access'
  const parts = [
    app.priceMonthly > 0 ? `${fmtIdr(app.priceMonthly, app.currency)}/mo` : null,
    app.priceAnnual > 0 ? `${fmtIdr(app.priceAnnual, app.currency)}/yr` : null,
  ].filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join(' · ') : 'No price set'
}

export type Pricing = Pick<Application, 'priceMonthly' | 'priceAnnual' | 'currency' | 'trialDays'>

export interface PricingFieldsProps {
  value: Pricing
  onChange: (next: Pricing) => void
  tone?: 'default' | 'nested'
}

/** Monthly and annual price in IDR plus trial length. A price of 0 means that period is not offered. */
export function PricingFields({ value, onChange, tone = 'default' }: PricingFieldsProps) {
  function setNumber(key: 'priceMonthly' | 'priceAnnual' | 'trialDays', raw: string) {
    onChange({ ...value, [key]: Math.max(0, Math.floor(Number(raw) || 0)) })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Monthly price" hint="0 means monthly billing is not offered.">
        <Input
          tone={tone}
          type="number"
          min={0}
          step={1000}
          value={value.priceMonthly}
          onChange={(e) => setNumber('priceMonthly', e.target.value)}
          className="[&_input]:tabular-nums"
        />
      </FormField>
      <FormField label="Annual price" hint="0 means annual billing is not offered.">
        <Input
          tone={tone}
          type="number"
          min={0}
          step={1000}
          value={value.priceAnnual}
          onChange={(e) => setNumber('priceAnnual', e.target.value)}
          className="[&_input]:tabular-nums"
        />
      </FormField>
      <FormField label="Trial days" hint="0 starts new subscriptions as active.">
        <Input
          tone={tone}
          type="number"
          min={0}
          value={value.trialDays}
          onChange={(e) => setNumber('trialDays', e.target.value)}
          className="[&_input]:tabular-nums"
        />
      </FormField>
      <FormField label="Currency" hint="Prices are billed in Indonesian rupiah.">
        <Input tone={tone} value={value.currency} readOnly />
      </FormField>
    </div>
  )
}
