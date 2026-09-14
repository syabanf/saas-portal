import { buildInvoice, fmtDate, fmtIdr, needsRenewalInvoice } from '@scp/fixtures'
import { BILLING_PERIOD_LABEL } from '@scp/types'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Select,
} from '@scp/ui'
import { FileCheck } from 'lucide-react'
import * as React from 'react'
import { useCurrentUser } from '../../auth/auth'
import { actorOf, useScoped } from '../../state/app-state'

const DAY = 86_400_000
const WINDOWS = [7, 14, 30, 60]
const DEFAULT_WINDOW = 30

export interface GenerateInvoicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (count: number) => void
}

/** Renewal invoices for subscriptions whose period ends soon and has no invoice yet. */
export function GenerateInvoicesDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateInvoicesDialogProps) {
  const { subscriptions, invoices, tenantsById, applicationsById, dispatch } = useScoped()
  const user = useCurrentUser()
  const [days, setDays] = React.useState(DEFAULT_WINDOW)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  /** Fixed when the dialog opens so the list does not shift while it is open. */
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    if (open) {
      setDays(DEFAULT_WINDOW)
      setSelected(new Set())
      setNow(Date.now())
    }
  }, [open])

  const nowIso = new Date(now).toISOString()
  const due = React.useMemo(
    () =>
      subscriptions
        .filter(
          (s) =>
            needsRenewalInvoice(s, invoices) &&
            new Date(s.currentPeriodEnd).getTime() - now <= days * DAY,
        )
        .sort((a, b) => a.currentPeriodEnd.localeCompare(b.currentPeriodEnd)),
    [subscriptions, invoices, days, now],
  )
  const selectedDue = due.filter((s) => selected.has(s.id))
  const allSelected = due.length > 0 && selectedDue.length === due.length

  function toggle(id: string, checked: boolean) {
    setSelected((cur) => {
      const next = new Set(cur)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function generate() {
    const actor = actorOf(user)
    for (const s of selectedDue)
      dispatch({ type: 'invoices/generate', subscriptionId: s.id, actor })
    onGenerated(selectedDue.length)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Generate invoices</DialogTitle>
          <DialogDescription>
            One renewal invoice per subscription, for the period that starts when the current one
            ends. Each is due 14 days after today.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <FormField label="Period ends within" htmlFor="generate-window" className="w-44">
            <Select
              id="generate-window"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {WINDOWS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </FormField>
          {due.length > 0 ? (
            <label className="ml-auto flex h-11 items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(due.map((s) => s.id)) : new Set())
                }
              />
              Select all
            </label>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {due.length === 0 ? (
            <EmptyState
              icon={<FileCheck />}
              title={`Nothing due in the next ${days} days`}
              description="Every subscription ending in this window already has its renewal invoice."
            />
          ) : (
            due.map((s) => {
              const app = applicationsById.get(s.applicationId)
              const total = app
                ? buildInvoice(s, app, {
                    id: '',
                    number: '',
                    periodStart: s.currentPeriodEnd,
                    issuedAt: nowIso,
                  }).total
                : s.price
              return (
                <label
                  key={s.id}
                  className="bg-surface flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
                >
                  <Checkbox
                    checked={selected.has(s.id)}
                    onChange={(e) => toggle(s.id, e.target.checked)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {tenantsById.get(s.tenantId)?.name ?? s.tenantId}
                    </p>
                    <p className="text-muted text-xs">
                      {app?.name ?? s.applicationId} · {BILLING_PERIOD_LABEL[s.billingPeriod]} ·
                      ends {fmtDate(s.currentPeriodEnd)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{fmtIdr(total, s.currency)}</p>
                    <p className="text-muted text-xs">{fmtIdr(s.price, s.currency)} before PPN</p>
                  </div>
                </label>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedDue.length === 0} onClick={generate}>
            Generate {selectedDue.length} {selectedDue.length === 1 ? 'invoice' : 'invoices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
