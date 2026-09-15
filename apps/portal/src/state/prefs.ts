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

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable; the toggles still work for this visit */
  }
}

/** Puts the choices on the root element so the stylesheet can react to them. */
export function applyPrefs(prefs: Prefs): void {
  document.documentElement.dataset.compactTables = String(prefs.compactTables)
}
