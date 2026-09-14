import {
  buildInvoice,
  fmtDate,
  fmtIdr,
  invitationFields,
  newId,
  nextInvoiceNumber,
  priceFor,
} from '@scp/fixtures'
import type { BillingPeriod, Subscription, Tenant, TenantMember } from '@scp/types'
import { BILLING_PERIOD_LABEL } from '@scp/types'
import {
  Button,
  Banner,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  InvitationLink,
  KeyValue,
  Select,
  Stepper,
  ToggleRow,
} from '@scp/ui'
import { FileClock } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/auth'
import { COUNTRIES, countryLabel } from '../../components/master/TenantDialog'
import { slugify } from '../../components/master/slug'
import { actorOf, useScoped } from '../../state/app-state'
import { UnsavedChangesGuard } from '../../components/UnsavedChangesGuard'

const STEPS = ['Company', 'Admin', 'Application & billing', 'Invoice', 'Review']
const DAY = 86400000
const EMPTY = {
  name: '',
  code: '',
  billingEmail: '',
  country: 'ID',
  adminName: '',
  adminEmail: '',
  applicationId: '',
  billingPeriod: 'monthly' as BillingPeriod,
  sendInvoice: false,
}
const DRAFT_KEY = 'scp.admin.organization-draft.v1'

function readDraft(): { draft: typeof EMPTY; step: number; startedAt: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
    return saved?.draft ? saved : null
  } catch {
    return null
  }
}

export function OrganizationNewPage() {
  const { users, tenants, applications, invoices, dispatch } = useScoped()
  const me = useCurrentUser()
  const restored = React.useRef(readDraft())
  const [step, setStep] = React.useState(restored.current?.step ?? 0)
  const [draft, setDraft] = React.useState(restored.current?.draft ?? EMPTY)
  const [created, setCreated] = React.useState<{ tenant: Tenant; member: TenantMember } | null>(
    null,
  )
  const [startedAt, setStartedAt] = React.useState(
    () => restored.current?.startedAt ?? new Date().toISOString(),
  )
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY)

  React.useEffect(() => {
    if (!dirty || created) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step, startedAt }))
  }, [draft, step, startedAt, dirty, created])
  const app = applications.find((a) => a.id === draft.applicationId)
  const choices = applications.filter(
    (a) =>
      a.status === 'active' && a.accessPolicy === 'subscription' && a.authMode !== 'service_only',
  )
  const freeApps = applications.filter(
    (a) => a.status === 'active' && a.accessPolicy === 'free' && a.authMode !== 'service_only',
  )
  const price = app ? priceFor(app, draft.billingPeriod) : 0
  const trial = Boolean(app && app.trialDays > 0)
  const existing = users.find(
    (u) => u.email.toLowerCase() === draft.adminEmail.trim().toLowerCase(),
  )
  const code = slugify(draft.code || draft.name)
  const duplicateCode = tenants.some((t) => t.code === code)
  const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const valid = [
    Boolean(draft.name.trim() && code && !duplicateCode && emailValid(draft.billingEmail)),
    Boolean(
      emailValid(draft.adminEmail) &&
      (existing || draft.adminName.trim()) &&
      !existing?.platformAdmin &&
      existing?.status !== 'disabled',
    ),
    !draft.applicationId || Boolean(app && price > 0),
    true,
    true,
  ]
  const firstPaidStart = new Date(
    Date.parse(startedAt) + (trial ? app!.trialDays : 0) * DAY,
  ).toISOString()
  const firstPaidEnd = new Date(
    Date.parse(firstPaidStart) + (draft.billingPeriod === 'annual' ? 365 : 30) * DAY,
  ).toISOString()
  const invoiceNow = Boolean(app && !trial && draft.sendInvoice)
  const invoiceSummary = !app
    ? 'No invoice; no paid subscription'
    : trial
      ? `No invoice during trial. First billable period starts ${fmtDate(firstPaidStart)}.`
      : invoiceNow
        ? `Create now; due ${fmtDate(new Date(Date.parse(startedAt) + 14 * DAY).toISOString())}`
        : 'Create later from organization billing'
  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }
  function activate() {
    if (!valid.slice(0, 3).every(Boolean) || created) return
    const actor = actorOf(me)
    const tenant: Tenant = {
      id: newId('ten'),
      name: draft.name.trim(),
      code,
      status: 'active',
      billingEmail: draft.billingEmail.trim(),
      country: draft.country,
      createdAt: startedAt,
      updatedAt: startedAt,
    }
    const user = existing ?? {
      id: newId('usr'),
      name: draft.adminName.trim(),
      email: draft.adminEmail.trim().toLowerCase(),
      status: 'invited' as const,
      platformAdmin: false,
      createdAt: startedAt,
      updatedAt: startedAt,
    }
    const member: TenantMember = {
      id: newId('mem'),
      tenantId: tenant.id,
      userId: user.id,
      workspaceRole: 'workspace_admin',
      status: 'invited',
      applicationIds: [...freeApps.map((a) => a.id), ...(app ? [app.id] : [])],
      ...invitationFields(),
    }
    dispatch({ type: 'tenants/upsert', tenant, actor })
    if (!existing) dispatch({ type: 'users/upsert', user })
    dispatch({ type: 'members/upsert', member })
    if (app) {
      const sub: Subscription = {
        id: newId('sub'),
        tenantId: tenant.id,
        applicationId: app.id,
        billingPeriod: draft.billingPeriod,
        price,
        currency: app.currency,
        status: trial ? 'trial' : 'active',
        startedAt,
        currentPeriodStart: startedAt,
        currentPeriodEnd: trial ? firstPaidStart : firstPaidEnd,
        gracePeriodEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: startedAt,
        updatedAt: startedAt,
      }
      dispatch({ type: 'subscriptions/upsert', subscription: sub, actor })
      if (invoiceNow)
        dispatch({
          type: 'invoices/upsert',
          invoice: buildInvoice(sub, app, {
            id: newId('inv'),
            number: nextInvoiceNumber(invoices),
            periodStart: firstPaidStart,
            issuedAt: startedAt,
          }),
        })
    }
    localStorage.removeItem(DRAFT_KEY)
    setCreated({ tenant, member })
  }
  if (created && !tenants.some((t) => t.id === created.tenant.id))
    return (
      <p role="status" className="p-8">
        Saving workspace and invitation…
      </p>
    )
  if (created)
    return (
      <Card>
        <CardContent className="space-y-4 p-8">
          <h1 className="text-2xl font-bold">Workspace created</h1>
          <p>
            {created.tenant.name} is ready. Share the invitation with{' '}
            {existing?.name ?? draft.adminName} to complete admin setup.
          </p>
          <InvitationLink
            token={created.member.invitationToken}
            expiresAt={created.member.invitationExpiresAt}
            portalUrl={`${window.location.protocol}//${window.location.hostname}:5174`}
            onRenew={() => {
              const member = { ...created.member, ...invitationFields() }
              dispatch({ type: 'members/upsert', member })
              setCreated({ ...created, member })
            }}
          />
          <Button asChild>
            <Link to={`/organizations/${created.tenant.id}`}>Open organization</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY)
              setCreated(null)
              setDraft(EMPTY)
              setStep(0)
              setStartedAt(new Date().toISOString())
            }}
          >
            Add another
          </Button>
        </CardContent>
      </Card>
    )
  const review = [
    { label: 'Company', value: `${draft.name} · ${code}` },
    { label: 'Country', value: countryLabel(draft.country) },
    { label: 'Billing email', value: draft.billingEmail },
    { label: 'Admin', value: `${existing?.name ?? draft.adminName} · ${draft.adminEmail}` },
    { label: 'Paid application', value: app?.name ?? 'Set up subscriptions later' },
    {
      label: 'Free applications',
      value: freeApps.map((a) => a.name).join(', ') || 'None published',
    },
    ...(app
      ? [
          {
            label: 'Billing',
            value: `${BILLING_PERIOD_LABEL[draft.billingPeriod]} · ${fmtIdr(price, app.currency)} before tax`,
          },
          {
            label: 'Trial',
            value: trial
              ? `${fmtDate(startedAt)} – ${fmtDate(firstPaidStart)}`
              : 'No trial; access starts today',
          },
          {
            label: 'First billable period',
            value: `${fmtDate(firstPaidStart)} – ${fmtDate(firstPaidEnd)}`,
          },
          {
            label: 'First invoice total',
            value: `${fmtIdr(price + Math.round(price * 0.11), app.currency)} including 11% tax`,
          },
        ]
      : []),
    { label: 'Invoice timing', value: invoiceSummary },
  ]
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <UnsavedChangesGuard when={dirty} />
      {restored.current ? (
        <Banner
          icon={<FileClock />}
          title="Draft restored."
          description="Continue where you left off, or clear the form and start again."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY)
                restored.current = null
                setDraft(EMPTY)
                setStep(0)
                setStartedAt(new Date().toISOString())
              }}
            >
              Clear draft
            </Button>
          }
        />
      ) : null}
      <h1 className="text-2xl font-bold">New organization</h1>
      <p className="text-muted">
        Create a workspace and invite its first admin. Paid subscriptions are optional.
      </p>
      <Stepper steps={STEPS} current={step} />
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <FormField label="Company name" htmlFor="company-name">
                <Input
                  id="company-name"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </FormField>
              <FormField
                label="Workspace code"
                htmlFor="company-code"
                error={duplicateCode ? 'This code is already in use.' : undefined}
              >
                <Input
                  id="company-code"
                  value={draft.code}
                  placeholder={slugify(draft.name)}
                  onChange={(e) => set('code', e.target.value)}
                />
              </FormField>
              <FormField label="Billing email" htmlFor="company-email">
                <Input
                  id="company-email"
                  type="email"
                  value={draft.billingEmail}
                  onChange={(e) => set('billingEmail', e.target.value)}
                />
              </FormField>
              <FormField label="Country" htmlFor="company-country">
                <Select
                  id="company-country"
                  value={draft.country}
                  onChange={(e) => set('country', e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
          {step === 1 && (
            <>
              <FormField
                label="Admin email"
                htmlFor="admin-email"
                error={
                  existing?.platformAdmin || existing?.status === 'disabled'
                    ? 'Choose an enabled tenant account.'
                    : undefined
                }
                hint={
                  existing
                    ? `${existing.name} already has an account and will be invited to this workspace.`
                    : undefined
                }
              >
                <Input
                  id="admin-email"
                  type="email"
                  value={draft.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                />
              </FormField>
              {!existing && (
                <FormField label="Admin name" htmlFor="admin-name">
                  <Input
                    id="admin-name"
                    value={draft.adminName}
                    onChange={(e) => set('adminName', e.target.value)}
                  />
                </FormField>
              )}
              <p className="text-muted">
                The admin will receive access to the selected paid application and all published
                free applications after accepting the invitation.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <FormField label="Paid application" htmlFor="paid-app">
                <Select
                  id="paid-app"
                  value={draft.applicationId}
                  onChange={(e) => {
                    const selected = choices.find((a) => a.id === e.target.value)
                    setDraft((d) => ({
                      ...d,
                      applicationId: e.target.value,
                      billingPeriod: selected?.priceMonthly ? 'monthly' : 'annual',
                      sendInvoice: false,
                    }))
                  }}
                >
                  <option value="">Set up subscriptions later / free applications only</option>
                  {choices.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              {app && (
                <FormField label="Billing period" htmlFor="billing-period">
                  <Select
                    id="billing-period"
                    value={draft.billingPeriod}
                    onChange={(e) => set('billingPeriod', e.target.value as BillingPeriod)}
                  >
                    {(['monthly', 'annual'] as const).map((p) => (
                      <option key={p} value={p} disabled={priceFor(app, p) <= 0}>
                        {BILLING_PERIOD_LABEL[p]} · {fmtIdr(priceFor(app, p), app.currency)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              <p>
                Included free applications:{' '}
                {freeApps.map((a) => a.name).join(', ') || 'None published yet'}.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <KeyValue
                rows={review.filter((r) =>
                  [
                    'Billing',
                    'Trial',
                    'First billable period',
                    'First invoice total',
                    'Invoice timing',
                  ].includes(r.label),
                )}
              />
              {app && !trial && (
                <ToggleRow
                  title="Create invoice now"
                  description="Creates an open invoice due in 14 days. This demo does not send email."
                  checked={draft.sendInvoice}
                  onCheckedChange={(v) => set('sendInvoice', v)}
                />
              )}
              {trial && (
                <p className="text-muted">
                  No invoice is created during the free trial. Generate the first invoice from
                  billing when the trial ends.
                </p>
              )}
            </>
          )}
          {step === 4 && (
            <>
              <KeyValue rows={review} />
              <p className="text-muted">
                An invitation link will be available after creation. No invitation email is sent by
                this demo.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {step < 4 ? (
          <Button disabled={!valid[step]} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button onClick={activate} disabled={!valid.slice(0, 3).every(Boolean)}>
            Create workspace
          </Button>
        )}
      </div>
      <Link className="text-muted text-sm underline" to="/organizations">
        Cancel and return to organizations
      </Link>
    </div>
  )
}
