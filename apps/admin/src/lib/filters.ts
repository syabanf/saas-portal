import type { ComboboxOption } from '@scp/ui'
import * as React from 'react'
import { useSearchParams } from 'react-router'

/** Pill styling for a search input that sits on the grey canvas. */
export const PILL_INPUT =
  '[&_input]:bg-card [&_input]:shadow-card [&_input]:rounded-full [&_input]:border-0'
/** Pill styling for a default-tone Combobox that sits on the grey canvas. */
export const PILL_COMBOBOX =
  '[&_[role=combobox]]:bg-card [&_[role=combobox]]:shadow-card [&_[role=combobox]]:rounded-full [&_[role=combobox]]:border-0'

export interface FilterParams<K extends string> {
  /** Current value per key; '' when the param is absent. */
  values: Record<K, string>
  /** Writes one filter; '' or 'all' removes it from the URL. */
  set: (key: K, value: string) => void
  clear: () => void
  active: boolean
}

/** List filters kept in the URL so links and reloads keep their state. */
export function useFilterParams<K extends string>(keys: readonly K[]): FilterParams<K> {
  const [params, setParams] = useSearchParams()
  const values = React.useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>,
    [keys, params],
  )
  const set = React.useCallback(
    (key: K, value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value && value !== 'all') next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  const clear = React.useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const k of keys) next.delete(k)
        return next
      },
      { replace: true },
    )
  }, [keys, setParams])
  const active = keys.some((k) => values[k] !== '')
  return { values, set, clear, active }
}

export const DAY = 86_400_000

export interface WindowOption extends ComboboxOption {
  /** null = no limit. */
  days: number | null
}

export function windowDays(windows: WindowOption[], value: string): number | null {
  return windows.find((w) => w.value === value)?.days ?? null
}

/** True when `iso` is at most `days` old. */
export function withinLastDays(iso: string | null, days: number | null, now: number): boolean {
  if (days === null) return true
  if (!iso) return false
  const age = now - new Date(iso).getTime()
  return age >= 0 && age <= days * DAY
}

/** True when `iso` falls between now and `days` from now. */
export function endsWithinDays(iso: string, days: number | null, now: number): boolean {
  if (days === null) return true
  const diff = new Date(iso).getTime() - now
  return diff >= 0 && diff <= days * DAY
}

export interface UrlFilters {
  /** Value of a filter, `fallback` when the param is absent. */
  get: (key: string, fallback?: string) => string
  set: (key: string, value: string) => void
  active: boolean
  clear: () => void
}

/** Same URL persistence with a getter API; 'all' stands in for an absent param. */
export function useUrlFilters(keys: readonly string[]): UrlFilters {
  const { values, set, clear, active } = useFilterParams(keys)
  return React.useMemo(
    () => ({ get: (key, fallback = 'all') => values[key] || fallback, set, clear, active }),
    [values, set, clear, active],
  )
}
