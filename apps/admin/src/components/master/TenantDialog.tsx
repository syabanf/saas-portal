import { newId } from '@scp/fixtures'
import type { Tenant, TenantStatus } from '@scp/types'
import { TENANT_STATUS_LABEL } from '@scp/types'
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
} from '@scp/ui'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { labelOptions } from '../../lib/options'
import { actorOf, useScoped } from '../../state/app-state'
import { slugify } from './slug'

const COUNTRIES: { code: string; label: string }[] = [
  { code: 'ID', label: 'Indonesia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'TH', label: 'Thailand' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'PH', label: 'Philippines' },
  { code: 'AU', label: 'Australia' },
  { code: 'JP', label: 'Japan' },
  { code: 'US', label: 'United States' },
]

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code
}

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.label }))

const STATUS_OPTIONS = labelOptions(
  ['active', 'pending', 'suspended'] satisfies TenantStatus[],
  TENANT_STATUS_LABEL,
)

export function emptyTenant(): Tenant {
  const now = new Date().toISOString()
  return {
    id: '',
    name: '',
    code: '',
    status: 'active',
    billingEmail: '',
    country: 'ID',
    createdAt: now,
    updatedAt: now,
  }
}

export interface TenantDialogProps {
  /** null = closed; `id === ''` = create. */
  tenant: Tenant | null
  onOpenChange: (open: boolean) => void
}

export function TenantDialog({ tenant, onOpenChange }: TenantDialogProps) {
  const { dispatch } = useScoped()
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState<Tenant>(() => tenant ?? emptyTenant())
  const [codeTouched, setCodeTouched] = React.useState(false)
  React.useEffect(() => {
    if (tenant) {
      setDraft(tenant)
      setCodeTouched(tenant.id !== '')
    }
  }, [tenant])

  const isCreate = draft.id === ''

  function set<K extends keyof Tenant>(key: K, value: Tenant[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const now = new Date().toISOString()
    const next: Tenant = {
      ...draft,
      id: isCreate ? newId('ten') : draft.id,
      code: slugify(draft.code || draft.name),
      createdAt: isCreate ? now : draft.createdAt,
      updatedAt: now,
    }
    dispatch({ type: 'tenants/upsert', tenant: next, actor: actorOf(user) })
    onOpenChange(false)
  }

  return (
    <Dialog open={tenant !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New organization' : 'Edit organization'}</DialogTitle>
            <DialogDescription>
              Subscriptions, users and invoices all attach to the organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" className="sm:col-span-2">
              <Input
                value={draft.name}
                onChange={(e) => {
                  set('name', e.target.value)
                  if (!codeTouched) set('code', slugify(e.target.value))
                }}
                placeholder="PT Alpha Manufaktur"
                required
              />
            </FormField>
            <FormField label="Code" hint="Short identifier used in URLs and reports.">
              <Input
                value={draft.code}
                onChange={(e) => {
                  setCodeTouched(true)
                  set('code', e.target.value)
                }}
                placeholder="alpha"
                className="[&_input]:font-mono"
                required
              />
            </FormField>
            <FormField label="Status" htmlFor="tenant-status">
              <Combobox
                id="tenant-status"
                value={draft.status}
                onChange={(v) => set('status', v as TenantStatus)}
                options={STATUS_OPTIONS}
                searchPlaceholder="Search statuses…"
              />
            </FormField>
            <FormField label="Billing email">
              <Input
                type="email"
                value={draft.billingEmail}
                onChange={(e) => set('billingEmail', e.target.value)}
                placeholder="billing@alpha.co.id"
                required
              />
            </FormField>
            <FormField label="Country" htmlFor="tenant-country">
              <Combobox
                id="tenant-country"
                value={draft.country}
                onChange={(v) => set('country', v)}
                options={COUNTRY_OPTIONS}
                searchPlaceholder="Search countries…"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isCreate ? 'Create organization' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
