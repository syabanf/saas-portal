import { I18nProvider, isLocale, type Locale } from '@scp/i18n'
import * as React from 'react'

const LOCALE_KEY = 'scp.portal.locale'

function defaultLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en'
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    return isLocale(stored) ? stored : defaultLocale()
  } catch {
    return defaultLocale()
  }
}

function writeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* storage unavailable; the choice lasts for this visit */
  }
}

/** Owns the persisted language choice and hands it to the i18n provider. */
export function PortalI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>(readLocale)
  const change = React.useCallback((next: Locale) => {
    writeLocale(next)
    setLocale(next)
  }, [])
  return (
    <I18nProvider locale={locale} onLocaleChange={change}>
      {children}
    </I18nProvider>
  )
}
