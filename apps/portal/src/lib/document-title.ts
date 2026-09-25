import { useT } from '@scp/i18n'
import * as React from 'react'

/** Browser tab title in the active language: "Billing · SaaS Portal". */
export function useDocumentTitle(title: string): void {
  const t = useT()
  const brand = t('common.saasPortal')
  React.useEffect(() => {
    document.title = `${title} · ${brand}`
  }, [title, brand])
}
