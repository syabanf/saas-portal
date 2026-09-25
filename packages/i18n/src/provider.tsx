import * as React from 'react'
import { en } from './dictionaries/en'
import { id } from './dictionaries/id'
import {
  interpolate,
  type DictKey,
  type Dictionary,
  type Locale,
  type TranslateVars,
} from './dictionary'
import { formatAgo, formatDate, formatDateTime } from './format'

const DICTIONARIES: Record<Locale, Dictionary> = { en, id }

export type Translate = (key: DictKey, vars?: TranslateVars) => string

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

export function I18nProvider({
  locale,
  onLocaleChange,
  children,
}: {
  locale: Locale
  /** Called when a language switch asks for a new locale; the host persists it. */
  onLocaleChange?: (locale: Locale) => void
  children: React.ReactNode
}) {
  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = React.useMemo<I18nContextValue>(() => {
    const dictionary = DICTIONARIES[locale]
    return {
      locale,
      setLocale: (next) => onLocaleChange?.(next),
      t: (key, vars) => interpolate(dictionary[key], vars),
    }
  }, [locale, onLocaleChange])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside I18nProvider')
  return ctx
}

export function useT(): Translate {
  return useI18n().t
}

export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale }
}

export interface Formatters {
  formatDate: (iso: string | null | undefined) => string
  formatDateTime: (iso: string | null | undefined) => string
  formatAgo: (iso: string | null | undefined, now?: number) => string
}

/** Date formatters bound to the active locale. */
export function useFormat(): Formatters {
  const { locale } = useI18n()
  return React.useMemo(
    () => ({
      formatDate: (iso) => formatDate(locale, iso),
      formatDateTime: (iso) => formatDateTime(locale, iso),
      formatAgo: (iso, now) => formatAgo(locale, iso, now),
    }),
    [locale],
  )
}
