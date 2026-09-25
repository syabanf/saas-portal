import { useT } from '@scp/i18n'
import { UiLabelsProvider, type UiLabels } from '@scp/ui'
import * as React from 'react'

/** Translates the strings the UI kit renders on its own (dialog close, pagination, documents). */
export function PortalUiLabels({ children }: { children: React.ReactNode }) {
  const t = useT()
  const labels = React.useMemo<UiLabels>(
    () => ({
      close: t('ui.close'),
      dismiss: t('ui.dismiss'),
      clear: t('ui.clear'),
      menu: t('ui.menu'),
      closeMenu: t('ui.closeMenu'),
      expandMenu: t('ui.expandMenu'),
      collapseMenu: t('ui.collapseMenu'),
      selectVisibleRows: t('ui.selectVisibleRows'),
      previousPage: t('ui.previousPage'),
      nextPage: t('ui.nextPage'),
      pageOf: (current, total) => t('ui.pageOf', { current, total }),
      rangeOf: (from, to, total) => t('ui.rangeOf', { from, to, total }),
      invoice: {
        title: t('ui.invoice.title'),
        issued: t('ui.invoice.issued'),
        due: t('ui.invoice.due'),
        paid: t('ui.invoice.paid'),
        from: t('ui.invoice.from'),
        billTo: t('ui.invoice.billTo'),
        description: t('ui.invoice.description'),
        period: t('ui.invoice.period'),
        amount: t('ui.invoice.amount'),
        subtotal: t('ui.invoice.subtotal'),
        total: t('ui.invoice.total'),
        payment: t('ui.invoice.payment'),
      },
      receipt: {
        title: t('ui.receipt.title'),
        paid: t('ui.receipt.paid'),
        paidOn: (date) => t('ui.receipt.paidOn', { date }),
        receivedBy: t('ui.receipt.receivedBy'),
        receivedFrom: t('ui.receipt.receivedFrom'),
        paymentFor: t('ui.receipt.paymentFor'),
        amount: t('ui.receipt.amount'),
        paymentDetails: t('ui.receipt.paymentDetails'),
      },
    }),
    [t],
  )
  return <UiLabelsProvider labels={labels}>{children}</UiLabelsProvider>
}
