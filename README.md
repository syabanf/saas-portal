# SaaS Gate

Frontend for a SaaS Control Plane: one identity, one commercial access layer, many applications. An organization subscribes to each application separately, monthly or annually. The backend enforces access when an application is opened; these frontends show and manage the commercial state and each application keeps its own RBAC.

Two apps share one domain model and one in-browser mock of the control plane API:

| App           | URL                   | Audience                                                                                                                                                       |
| ------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin`  | http://localhost:5173 | Platform admin console (organizations, users, applications and pricing, subscriptions, billing, payments, API clients, access policies, webhooks, logs, audit) |
| `apps/portal` | http://localhost:5174 | SaaS Portal for tenant admins and end users (application launcher, subscription and billing self-service)                                                      |

## Run

```bash
pnpm install
pnpm dev:admin    # or pnpm dev:portal, or pnpm dev for both
```

Demo accounts (any password):

- Admin console: `admin@platform.example`
- Portal: `alpha.admin@example.com` (PT Alpha, everything active), `beta.admin@example.com` (PT Beta, IoT in grace period), `gamma.admin@example.com` (PT Gamma, IoT suspended)

In development, both apps use a shared local demo store at `.demo-state.json`. Changes made in Admin appear in Portal within about two seconds. Run both apps with `pnpm dev` to test invitations and onboarding across roles. Each action is serialized through a file lock and retried with an idempotency key. Failed saves remain queued in the open tab with a Retry action; do not close the tab until saving finishes. "Reset demo data" resets the shared store for both apps.

The Vite demo endpoint is local development infrastructure, with no production authentication or payment processing. Static builds retain separate browser-local state. Connecting a production backend still requires the commercial APIs as well as identity integration.

Invitations are shareable demo links valid for seven days. Creating or renewing an invitation does not send email. Admins choose the workspace role and application access before creating the invitation, then copy its link from the member list. The recipient accepts the invitation and signs in with the invited email (any demo password). Expired links must be renewed by an admin; renewal invalidates the old link.

Organizations can be created with free apps only and add paid subscriptions later. Trial onboarding creates no invoice during the free period. The review shows the trial dates, first billable period, amount including tax, and invoice timing. Generate the first invoice from Billing when the trial ends.

Members see their own activity and application access, with direct workspace-admin contacts for blocked apps. Users, subscriptions, invoice documents, and payment routes are restricted to workspace admins. An organization suspension overrides every launcher card.

Billing-period changes are scheduled for the current period end. The current price remains visible until that date, and renewal invoices use the scheduled terms. Changes can be withdrawn before the next period is invoiced. Once invoiced, resolve the invoice before changing its terms.

## Layout

```
apps/
  admin/       Vite + React, platform admin shell and pages
  portal/      Vite + React, tenant portal, launcher and demo applications
packages/
  types/       domain model and label maps (no dependencies)
  fixtures/    seeded JSON data, reducer store, subscription state helpers, formatting
  integration/ ControlPlaneApi contract (identity) with mock and http adapters
  ui/          component kit (Tailwind v4 + Radix + lucide)
  tailwind-config/ semantic tokens (theme.css)
  tsconfig/    shared TypeScript configs
scripts/
  generate-fixtures.ts  deterministic seed (pnpm gen:fixtures)
```

Dependencies point down only: `apps → ui / fixtures / integration → types`.

## Scripts

- `pnpm test` verifies invitation acceptance/expiry, access states, and scheduled billing.
- `pnpm typecheck` runs `tsc --noEmit` in every package and app.
- `pnpm build` builds both apps through Turborepo.
- `pnpm gen:fixtures` regenerates `packages/fixtures/data/*.json`.
- `pnpm format` runs Prettier with the Tailwind class-order plugin.

## Domain model

- `Application` (called a Product in the console): type, integration mode, the product API URL, the callback URL, access policy (subscription required, free, manual), allowed subscription statuses, monthly and annual price, trial days, integration health.
- `Subscription`: organization × application × billing period (`monthly` | `annual`) with the state machine draft → trial → active → past_due → grace_period → suspended → expired (or cancelled).
- `Invoice` and `Payment` follow the subscription. A payment is a Xendit-style request (virtual account, e-wallet, QRIS, card or retail code) with a provider id, expiry, instructions and an event timeline. The portal checkout at `/billing/:id/pay` creates the request, `/payments/:id` shows the instructions and status, and a simulated PAID callback settles the invoice and reactivates the subscription.
- `TenantMember.applicationIds` records which applications a user may enter. The backend combines it with the subscription state when the user opens an application.

A product declares one of two integration modes:

| Mode      | Request chain                                                                                |
| --------- | -------------------------------------------------------------------------------------------- |
| `verify`  | Application → SaaS Gate check → subscription state → allow or deny → the application answers |
| `gateway` | Caller → SaaS Gate gateway → subscription state → product API → response                     |

Creating or editing a product asks for the mode plus two URLs (the product API and the sign-in callback); pricing and the token settings keep safe defaults. The product page shows the chain, both URLs and a copy-paste guide for the chosen mode.

`packages/fixtures/src/access.ts` holds the display helpers (`appAccessFor`, `subscriptionAccessOutcome`) that turn those records into launcher card states. Swap `mode` to `http` in Settings to point the identity adapter at a real backend.
