import * as React from 'react'

/** Every English string the kit renders on its own, so an app can translate them in one place. */
export interface UiLabels {
  close: string
  dismiss: string
  clear: string
  menu: string
  closeMenu: string
  expandMenu: string
  collapseMenu: string
  selectVisibleRows: string
  previousPage: string
  nextPage: string
  /** "Page 2 / 5" */
  pageOf: (current: number, total: number) => string
  /** "11–20 of 42" */
  rangeOf: (from: number, to: number, total: number) => string
  invoice: {
    title: string
    issued: string
    due: string
    paid: string
    from: string
    billTo: string
    description: string
    period: string
    amount: string
    subtotal: string
    total: string
    payment: string
  }
  receipt: {
    title: string
    paid: string
    paidOn: (date: string) => string
    receivedBy: string
    receivedFrom: string
    paymentFor: string
    amount: string
    paymentDetails: string
  }
}

export const DEFAULT_UI_LABELS: UiLabels = {
  close: 'Close',
  dismiss: 'Dismiss',
  clear: 'Clear',
  menu: 'Menu',
  closeMenu: 'Close menu',
  expandMenu: 'Expand menu',
  collapseMenu: 'Collapse menu',
  selectVisibleRows: 'Select visible rows',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageOf: (current, total) => `Page ${current} / ${total}`,
  rangeOf: (from, to, total) => `${from}–${to} of ${total}`,
  invoice: {
    title: 'Invoice',
    issued: 'Issued',
    due: 'Due',
    paid: 'Paid',
    from: 'From',
    billTo: 'Bill to',
    description: 'Description',
    period: 'Period',
    amount: 'Amount',
    subtotal: 'Subtotal',
    total: 'Total',
    payment: 'Payment',
  },
  receipt: {
    title: 'Payment receipt',
    paid: 'Paid',
    paidOn: (date) => `Paid ${date}`,
    receivedBy: 'Received by',
    receivedFrom: 'Received from',
    paymentFor: 'Payment for',
    amount: 'Amount',
    paymentDetails: 'Payment details',
  },
}

const UiLabelsContext = React.createContext<UiLabels>(DEFAULT_UI_LABELS)

export function UiLabelsProvider({
  labels,
  children,
}: {
  labels: UiLabels
  children: React.ReactNode
}) {
  return <UiLabelsContext.Provider value={labels}>{children}</UiLabelsContext.Provider>
}

export function useUiLabels(): UiLabels {
  return React.useContext(UiLabelsContext)
}
