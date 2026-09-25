import { LOCALES, isLocale, useLocale, useT } from '@scp/i18n'
import { Combobox } from '@scp/ui'

/** Language picker shared by Settings and Profile; the choice persists per browser. */
export function LanguageCombobox({ id }: { id: string }) {
  const t = useT()
  const { locale, setLocale } = useLocale()
  return (
    <Combobox
      id={id}
      value={locale}
      onChange={(value) => {
        if (isLocale(value)) setLocale(value)
      }}
      options={LOCALES}
      searchPlaceholder={t('common.searchLanguages')}
      emptyText={t('common.noMatches')}
    />
  )
}
