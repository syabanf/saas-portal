import { ToastProvider, TooltipProvider } from '@scp/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/auth'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { router } from './router'
import { ApiProvider } from './state/api'
import { AppStateProvider } from './state/app-state'
import { PortalI18nProvider } from './state/locale'
import { PrefsProvider } from './state/prefs'
import { PortalUiLabels } from './state/ui-labels'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalI18nProvider>
      <PortalUiLabels>
        <PrefsProvider>
          <AppStateProvider>
            <AuthProvider>
              <ApiProvider>
                <TooltipProvider delayDuration={200}>
                  <RouterProvider router={router} />
                  <ToastProvider />
                </TooltipProvider>
              </ApiProvider>
            </AuthProvider>
          </AppStateProvider>
        </PrefsProvider>
      </PortalUiLabels>
    </PortalI18nProvider>
  </StrictMode>,
)
