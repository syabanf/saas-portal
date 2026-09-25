import { useT } from '@scp/i18n'
import { Button, Combobox, type ComboboxOption, type EmptyStateProps } from '@scp/ui'
import { FilterX, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { PortalApplication } from '../state/app-state'
import { pricingLine } from './AppCard'

export const ALL = 'all'

/** List filters kept in the URL so a filtered view survives reloads and can be shared. */
export function useFilterParams<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>

  function set(key: K, value: string) {
    const next = new URLSearchParams(params)
    if (value && value !== ALL) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function clear() {
    const next = new URLSearchParams(params)
    for (const k of keys) next.delete(k)
    setParams(next, { replace: true })
  }

  return { values, set, clear, active: keys.some((k) => params.has(k)) }
}

/** Options for a fixed enum, labelled through the dictionary. */
export function enumOptions<T extends string>(
  values: readonly T[],
  label: (value: T) => string,
): ComboboxOption[] {
  return values.map((value) => ({ value, label: label(value) }))
}

/** Application picker options with the organization's pricing as the hint line. */
export function useApplicationOptions(): (items: PortalApplication[]) => ComboboxOption[] {
  const t = useT()
  return (items) =>
    items.map((item) => ({ value: item.app.id, label: item.app.name, hint: pricingLine(t, item) }))
}

/** Inline pill filter: '' or 'all' shows the "All …" option. */
export function FilterCombobox({
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder,
}: {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  allLabel: string
  searchPlaceholder: string
}) {
  const t = useT()
  return (
    <Combobox
      tone="ghost"
      value={value || ALL}
      onChange={onChange}
      options={[{ value: ALL, label: allLabel }, ...options]}
      searchPlaceholder={searchPlaceholder}
      emptyText={t('common.noMatches')}
    />
  )
}

export function ClearFiltersButton({
  onClick,
  variant = 'ghost',
}: {
  onClick: () => void
  variant?: 'ghost' | 'outline'
}) {
  const t = useT()
  return (
    <Button variant={variant} size="sm" onClick={onClick}>
      <FilterX /> {t('common.clearFilters')}
    </Button>
  )
}

/** Empty state for a list that has rows but none pass the current filters. */
export function useNoMatches(): (onClear: () => void) => EmptyStateProps {
  const t = useT()
  return (onClear) => ({
    icon: <SearchX />,
    title: t('common.noMatches'),
    description: t('common.noMatchesDescription'),
    action: <ClearFiltersButton variant="outline" onClick={onClear} />,
  })
}
