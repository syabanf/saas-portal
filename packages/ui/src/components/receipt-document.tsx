import { CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { useUiLabels } from './ui-labels'
import type { InvoiceParty } from './invoice-document'

export interface ReceiptRow {
  label: string
  value: string
}

export interface ReceiptDocumentProps {
  /** Receipt number, e.g. RCP-2026-1042. */
  number: string
  paidAt: string
  /** Total charged, shown large. */
  total: string
  payee: InvoiceParty
  payer: InvoiceParty
  /** What the payment covered: invoice, subscription, period. */
  items: ReceiptRow[]
  /** Amount breakdown, for example subtotal, tax and the amount paid. */
  amounts: ReceiptRow[]
  /** Provider details: Xendit id, channel, method, external id. */
  paymentRows: ReceiptRow[]
  notes?: string[]
  className?: string
}

function Rows({ rows }: { rows: ReceiptRow[] }) {
  return (
    <dl className="divide-border divide-y text-sm">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[140px_1fr] gap-3 py-2">
          <dt className="text-muted">{r.label}</dt>
          <dd className="font-medium break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Printable payment receipt. Pure presentation; the app maps its records to strings. */
export function ReceiptDocument({
  number,
  paidAt,
  total,
  payee,
  payer,
  items,
  amounts,
  paymentRows,
  notes = [],
  className,
}: ReceiptDocumentProps) {
  const l = useUiLabels().receipt
  return (
    <article
      className={cn(
        'rounded-card bg-card text-foreground shadow-card mx-auto w-full max-w-[210mm] p-8 sm:p-12 print:max-w-none print:rounded-none print:p-0 print:shadow-none',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">{l.title}</p>
          <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight">{number}</h1>
          <p className="text-muted mt-2 text-sm">{l.paidOn(paidAt)}</p>
        </div>
        <div className="bg-success-soft text-success print:border-success flex items-center gap-3 rounded-2xl px-4 py-3 print:border print:bg-transparent">
          <CheckCircle2 className="size-6" />
          <div>
            <p className="text-[11px] font-semibold tracking-wider uppercase">{l.paid}</p>
            <p className="text-xl font-extrabold tabular-nums">{total}</p>
          </div>
        </div>
      </header>

      <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.receivedBy}
          </p>
          <p className="mt-1 text-sm font-bold">{payee.name}</p>
          {payee.lines.map((l) => (
            <p key={l} className="text-body text-sm">
              {l}
            </p>
          ))}
        </div>
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.receivedFrom}
          </p>
          <p className="mt-1 text-sm font-bold">{payer.name}</p>
          {payer.lines.map((l) => (
            <p key={l} className="text-body text-sm">
              {l}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
          {l.paymentFor}
        </p>
        <Rows rows={items} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.amount}
          </p>
          <Rows rows={amounts} />
        </div>
        <div>
          <p className="text-muted text-[11px] font-semibold tracking-wider uppercase">
            {l.paymentDetails}
          </p>
          <Rows rows={paymentRows} />
        </div>
      </section>

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
