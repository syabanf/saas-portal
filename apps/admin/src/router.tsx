import { createBrowserRouter } from 'react-router'
import { ReceiptDocumentPage } from './pages/payments/ReceiptDocumentPage'
import { RequireAuth } from './auth/auth'
import { AdminLayout } from './layouts/AdminLayout'
import { AccessPoliciesPage } from './pages/access-policies/AccessPoliciesPage'
import { ApiClientsPage } from './pages/api-clients/ApiClientsPage'
import { ApplicationDetailPage } from './pages/applications/ApplicationDetailPage'
import { ApplicationEditPage } from './pages/applications/ApplicationEditPage'
import { ApplicationsPage } from './pages/applications/ApplicationsPage'
import { ProductForm } from './pages/applications/ProductForm'
import { AuditPage } from './pages/audit/AuditPage'
import { LoginPage } from './pages/auth/LoginPage'
import { BillingPage } from './pages/billing/BillingPage'
import { InvoiceDetailPage } from './pages/billing/InvoiceDetailPage'
import { InvoiceDocumentPage } from './pages/billing/InvoiceDocumentPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { HealthPage } from './pages/health/HealthPage'
import { LogsPage } from './pages/logs/LogsPage'
import { OrganizationDetailPage } from './pages/organizations/OrganizationDetailPage'
import { OrganizationNewPage } from './pages/organizations/OrganizationNewPage'
import { OrganizationsPage } from './pages/organizations/OrganizationsPage'
import { PaymentDetailPage } from './pages/payments/PaymentDetailPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { SdkPage } from './pages/sdk/SdkPage'
import { SecurityPage } from './pages/security/SecurityPage'
import { SessionsPage } from './pages/sessions/SessionsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { SubscriptionDetailPage } from './pages/subscriptions/SubscriptionDetailPage'
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage'
import { UsersPage } from './pages/users/UsersPage'
import { WebhookDetailPage } from './pages/webhooks/WebhookDetailPage'
import { WebhooksPage } from './pages/webhooks/WebhooksPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Outside the admin shell so printing shows only the document.
    path: '/billing/:id/document',
    element: (
      <RequireAuth>
        <InvoiceDocumentPage />
      </RequireAuth>
    ),
  },
  {
    path: '/payments/:id/receipt',
    element: (
      <RequireAuth>
        <ReceiptDocumentPage />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'organizations', element: <OrganizationsPage /> },
      { path: 'organizations/new', element: <OrganizationNewPage /> },
      { path: 'organizations/:id', element: <OrganizationDetailPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'applications', element: <ApplicationsPage /> },
      { path: 'applications/new', element: <ProductForm /> },
      { path: 'applications/:id', element: <ApplicationDetailPage /> },
      { path: 'applications/:id/edit', element: <ApplicationEditPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'subscriptions/:id', element: <SubscriptionDetailPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'billing/:id', element: <InvoiceDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'payments/:id', element: <PaymentDetailPage /> },
      { path: 'api-clients', element: <ApiClientsPage /> },
      { path: 'access-policies', element: <AccessPoliciesPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'webhooks', element: <WebhooksPage /> },
      { path: 'webhooks/:id', element: <WebhookDetailPage /> },
      { path: 'sdk', element: <SdkPage /> },
      { path: 'logs', element: <LogsPage /> },
      { path: 'health', element: <HealthPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'security', element: <SecurityPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
