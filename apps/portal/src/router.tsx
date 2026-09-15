import { createBrowserRouter } from 'react-router'
import { ReceiptDocumentPage } from './pages/payments/ReceiptDocumentPage'
import { RequireAuth, RequireWorkspaceAdmin } from './auth/auth'
import { PortalLayout } from './layouts/PortalLayout'
import { ApplicationsPage } from './pages/applications/ApplicationsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { BillingPage } from './pages/billing/BillingPage'
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage'
import { InvoiceDocumentPage } from './pages/billing/InvoiceDocumentPage'
import { PaymentPage } from './pages/billing/PaymentPage'
import { HomePage } from './pages/home/HomePage'
import { PaymentStatusPage } from './pages/payments/PaymentStatusPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { SubscriptionPage } from './pages/subscription/SubscriptionPage'
import { UsersPage } from './pages/users/UsersPage'

import { InvitationPage } from './pages/invitations/InvitationPage'

export const router = createBrowserRouter([
  { path: '/invite/:token', element: <InvitationPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <PortalLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'applications', element: <ApplicationsPage /> },
      { path: 'users', element: <UsersPage /> },
      {
        path: 'subscription',
        element: (
          <RequireWorkspaceAdmin>
            <SubscriptionPage />
          </RequireWorkspaceAdmin>
        ),
      },
      {
        path: 'billing',
        element: (
          <RequireWorkspaceAdmin>
            <BillingPage />
          </RequireWorkspaceAdmin>
        ),
      },
      {
        path: 'billing/:id',
        element: (
          <RequireWorkspaceAdmin>
            <InvoiceDetailPage />
          </RequireWorkspaceAdmin>
        ),
      },
      {
        path: 'billing/:id/pay',
        element: (
          <RequireWorkspaceAdmin>
            <PaymentPage />
          </RequireWorkspaceAdmin>
        ),
      },
      {
        path: 'payments/:paymentId',
        element: (
          <RequireWorkspaceAdmin>
            <PaymentStatusPage />
          </RequireWorkspaceAdmin>
        ),
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/billing/:id/document',
    element: (
      <RequireAuth>
        <RequireWorkspaceAdmin>
          <InvoiceDocumentPage />
        </RequireWorkspaceAdmin>
      </RequireAuth>
    ),
  },
  {
    path: '/payments/:paymentId/receipt',
    element: (
      <RequireAuth>
        <RequireWorkspaceAdmin>
          <ReceiptDocumentPage />
        </RequireWorkspaceAdmin>
      </RequireAuth>
    ),
  },
])
