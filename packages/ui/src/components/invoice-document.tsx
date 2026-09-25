import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'

export interface InvoiceParty {
  name: string
  lines: string[]
}

export interface InvoiceDocumentLine {
  description: string
  period?: string
  amount: string
}

export interface InvoiceDocumentProps {
  number: string
  /** Stamp text, e.g. PAID / UNPAID / OVERDUE / DRAFT / VOID. */
  stamp: string
  stampTone: 'success' | 'warning' | 'danger' | 'muted'
  issuedAt: string
  dueDate: string
  paidAt?: string | null
  seller: InvoiceParty
  buyer: InvoiceParty
  lines: InvoiceDocumentLine[]
  subtotal: string
  taxLabel: string
  tax: string
  total: string
  /** Rows shown under the totals: payment reference, channel, instructions. */
  paymentRows?: { label: string; value: string }[]
  notes?: string[]
  className?: string
}

const STAMP = {
  success: 'border-success text-success',
  warning: 'border-warning text-warning',
  danger: 'border-accent text-accent',
  muted: 'border-silver text-muted',
}

/**
 * Printable A4-style invoice. Pure presentation: the app maps its domain records to strings.
 * Wrap the page in `print-root` so the shell is hidden by the print stylesheet.
 */
export function InvoiceDocument({
  number,
  stamp,
  stampTone,
  issuedAt,
  dueDate,
  paidAt,
  seller,
  buyer,
  lines,
  subtotal,
  taxLabel,
  tax,
  total,
  paymentRows = [],
  notes = [],
  className,
}: InvoiceDocumentProps) {
  const l = useUiLabels().invoice
  return (
    <article
      className={cn(
        'invoice-document rounded-card bg-card text-foreground shadow-card mx-auto w-full max-w-[210mm] p-8 sm:p-12 print:max-w-none print:rounded-none print:p-0 print:shadow-none',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">{l.title}</p>
          <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight">{number}</h1>
          <dl className="mt-4 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">{l.issued}</dt>
            <dd>{issuedAt}</dd>
            <dt className="text-muted">{l.due}</dt>
            <dd>{dueDate}</dd>
            {paidAt ? (
              <>
                <dt className="text-muted">{l.paid}</dt>
                <dd>{paidAt}</dd>
              </>
            ) : null}
          </dl>
        </div>
        <div
          className={cn(
            'rotate-[-6deg] rounded-xl border-[3px] px-4 py-1.5 text-xl font-extrabold tracking-[0.2em] uppercase',
            STAMP[stampTone],
          )}
        >
          {stamp}
        </div>
      </header>

      <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">{l.from}</p>
          <p className="mt-1 text-sm font-bold">{seller.name}</p>
          {seller.lines.map((l) => (
            <p key={l} className="text-body text-sm">
              {l}
            </p>
          ))}
        </div>
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.billTo}
          </p>
          <p className="mt-1 text-sm font-bold">{buyer.name}</p>
          {buyer.lines.map((l) => (
            <p key={l} className="text-body text-sm">
              {l}
            </p>
          ))}
        </div>
      </section>

      <table className="mt-10 w-full text-sm">
        <thead>
          <tr className="border-border text-muted border-b text-left text-[11px] font-semibold tracking-wider uppercase">
            <th className="py-2 pr-4">{l.description}</th>
            <th className="py-2 pr-4">{l.period}</th>
            <th className="py-2 text-right">{l.amount}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-border border-b">
              <td className="py-3 pr-4 font-medium">{l.description}</td>
              <td className="text-muted py-3 pr-4">{l.period ?? ''}</td>
              <td className="py-3 text-right tabular-nums">{l.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{l.subtotal}</dt>
            <dd className="tabular-nums">{subtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{taxLabel}</dt>
            <dd className="tabular-nums">{tax}</dd>
          </div>
          <div className="border-border flex justify-between border-t pt-2 text-base font-bold">
            <dt>{l.total}</dt>
            <dd className="tabular-nums">{total}</dd>
          </div>
        </dl>
      </div>

      {paymentRows.length > 0 ? (
        <section className="bg-surface print:border-border mt-10 rounded-2xl p-5 print:border print:bg-transparent">
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.payment}
          </p>
          <dl className="mt-2 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-sm">
            {paymentRows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-muted">{r.label}</dt>
                <dd className="font-medium break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {notes.length > 0 ? (
        <footer className="text-muted mt-10 space-y-1 text-xs">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </footer>
      ) : null}
    </article>
  )
}
