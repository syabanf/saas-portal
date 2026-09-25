import * as React from 'react'

const PREFS_KEY = 'scp.admin.prefs'

/** Per-browser display and notification choices from the profile page. */
export interface AdminPrefs {
  compactTables: boolean
  emailFailedWebhooks: boolean
  demoHints: boolean
}

const DEFAULT_PREFS: AdminPrefs = {
  compactTables: false,
  emailFailedWebhooks: true,
  demoHints: true,
}

export function readPrefs(): AdminPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AdminPrefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function writePrefs(prefs: AdminPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable; the toggles still work for this visit */
  }
}

let current = readPrefs()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== PREFS_KEY) return
    current = readPrefs()
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Shared preferences: every subscriber sees a toggle flip at once, and the value is persisted. */
export function useAdminPrefs(): [
  AdminPrefs,
  <K extends keyof AdminPrefs>(key: K, value: AdminPrefs[K]) => void,
] {
  const prefs = React.useSyncExternalStore(subscribe, () => current)
  const setPref = React.useCallback(<K extends keyof AdminPrefs>(key: K, value: AdminPrefs[K]) => {
    current = { ...current, [key]: value }
    writePrefs(current)
    emit()
  }, [])
  return [prefs, setPref]
}
