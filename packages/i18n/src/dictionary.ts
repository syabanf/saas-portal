import { en } from './dictionaries/en'

export type Locale = 'en' | 'id'

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
]

/** Every key the English dictionary declares. Other locales must implement all of them. */
export type DictKey = keyof typeof en
export type Dictionary = Record<DictKey, string>

export type TranslateVars = Record<string, string | number>

/** Replaces `{name}` placeholders with the matching value; unknown names stay as written. */
export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'id'
}
