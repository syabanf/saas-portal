import { ToastProvider, TooltipProvider } from '@scp/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/auth'
import './index.css'
import { router } from './router'
import { ApiProvider } from './state/api'
import { AppStateProvider } from './state/app-state'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
