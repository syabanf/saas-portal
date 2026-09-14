import * as React from 'react'

export interface PortalSheets {
  openSupport: () => void
}

/** Lets pages open the layout-owned support sheet. */
export const PortalSheetsContext = React.createContext<PortalSheets>({
  openSupport: () => undefined,
})

export function usePortalSheets(): PortalSheets {
  return React.useContext(PortalSheetsContext)
}
