import * as React from 'react'

const PREFS_KEY = 'scp.portal.prefs'

/** Per-browser display and notification choices from the profile page. */
export interface Prefs {
  compactTables: boolean
  emailFailedPayments: boolean
  demoHints: boolean
}

const DEFAULT_PREFS: Prefs = {
  compactTables: false,
  emailFailedPayments: true,
  demoHints: true,
}

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable; the toggles still work for this visit */
  }
}

interface PrefsContextValue {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
}

const PrefsContext = React.createContext<PrefsContextValue | null>(null)

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = React.useState<Prefs>(readPrefs)
  const setPref = React.useCallback<PrefsContextValue['setPref']>((key, value) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value }
      writePrefs(next)
      return next
    })
  }, [])
  const value = React.useMemo(() => ({ prefs, setPref }), [prefs, setPref])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  const ctx = React.useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}
