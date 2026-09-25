import type { Locale } from './dictionary'

const INTL_LOCALE: Record<Locale, string> = { en: 'en-GB', id: 'id-ID' }

const dateFormatters = new Map<Locale, Intl.DateTimeFormat>()
const dateTimeFormatters = new Map<Locale, Intl.DateTimeFormat>()
const relativeFormatters = new Map<Locale, Intl.RelativeTimeFormat>()

function dateFormatter(locale: Locale): Intl.DateTimeFormat {
  let fmt = dateFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    dateFormatters.set(locale, fmt)
  }
  return fmt
}

function dateTimeFormatter(locale: Locale): Intl.DateTimeFormat {
  let fmt = dateTimeFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    dateTimeFormatters.set(locale, fmt)
  }
  return fmt
}

function relativeFormatter(locale: Locale): Intl.RelativeTimeFormat {
  let fmt = relativeFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' })
    relativeFormatters.set(locale, fmt)
  }
  return fmt
}

/** "25 Sept 2026" in English, "25 Sep 2026" in Indonesian. Empty input renders as a dash. */
export function formatDate(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateFormatter(locale).format(new Date(iso))
}

export function formatDateTime(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateTimeFormatter(locale).format(new Date(iso))
}

/** Relative wording up to a month back ("3 minutes ago", "3 menit yang lalu"), then the date. */
export function formatAgo(
  locale: Locale,
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!iso) return '—'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  const rtf = relativeFormatter(locale)
  if (min < 1) return rtf.format(0, 'second')
  if (min < 60) return rtf.format(-min, 'minute')
  const hours = Math.floor(min / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 30) return rtf.format(-days, 'day')
  return formatDate(locale, iso)
}
