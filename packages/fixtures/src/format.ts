const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
const num = new Intl.NumberFormat('en-US')
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function fmtIdr(amount: number, currency = 'IDR'): string {
  if (currency === 'IDR') return idr.format(amount)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function fmtNumber(value: number): string {
  return num.format(value)
}

export function fmtCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return num.format(value)
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateFmt.format(new Date(iso))
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateTimeFmt.format(new Date(iso))
}

export function fmtAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return fmtDate(iso)
}

export function fmtDaysUntil(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000)
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'today'
  if (days === 1) return '1 day remaining'
  return `${days} days remaining`
}

export function fmtMs(ms: number | null): string {
  if (ms === null) return '—'
  return `${ms} ms`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = ['#ed1c24', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777']
export function avatarColor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!
}
