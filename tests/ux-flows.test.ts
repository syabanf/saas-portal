import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appAccessFor,
  buildInvoice,
  invitationFields,
  loadFixtures,
  reducer,
} from '../packages/fixtures/src/index'
import type { Subscription, TenantMember } from '../packages/types/src/index'
const now = Date.parse('2026-09-15T00:00:00Z')
const actor = { id: 'test-admin', name: 'Test Admin' }
function setup() {
  const state = loadFixtures(now)
  const app = state.applications.find((a) => a.id === 'app-iot')!
  const sub: Subscription = {
    ...state.subscriptions.find((s) => s.applicationId === app.id)!,
    status: 'active',
    billingPeriod: 'monthly',
    price: app.priceMonthly,
    cancelAtPeriodEnd: false,
    currentPeriodStart: '2026-09-01T00:00:00Z',
    currentPeriodEnd: '2026-10-01T00:00:00Z',
  }
  state.subscriptions = [sub]
  state.invoices = []
  const member: TenantMember = {
    id: 'test-member',
    tenantId: sub.tenantId,
    userId: state.users.find((u) => !u.platformAdmin)!.id,
    status: 'active',
    workspaceRole: 'member',
    applicationIds: [app.id],
  }
  state.members = [member]
  return { state, app, sub, member }
}
test('organization suspension overrides active subscription and assigned membership', () => {
  const { state, app, sub, member } = setup()
  assert.equal(
    appAccessFor(app, sub, member, now, { ...state.tenants[0]!, status: 'suspended' }).state,
    'suspended',
  )
  assert.equal(
    appAccessFor(app, sub, member, now, { ...state.tenants[0]!, status: 'active' }).state,
    'active',
  )
})
test('invited members cannot launch until invitation acceptance', () => {
  const { state, app, sub, member } = setup()
  state.members = [{ ...member, status: 'invited', ...invitationFields(now) }]
  assert.equal(appAccessFor(app, sub, state.members[0]!, now).state, 'not_assigned')
  const next = reducer(state, {
    type: 'invitations/accept',
    token: state.members[0]!.invitationToken!,
    at: new Date(now).toISOString(),
  })
  assert.equal(appAccessFor(app, sub, next.members[0]!, now).state, 'active')
  assert.equal(next.members[0]!.invitationAcceptedAt, new Date(now).toISOString())
})
test('expired and replaced invitations are rejected; acceptance is idempotent', () => {
  const { state, member } = setup()
  state.members = [{ ...member, status: 'invited', ...invitationFields(now - 8 * 86400000) }]
  assert.equal(
    reducer(state, {
      type: 'invitations/accept',
      token: state.members[0]!.invitationToken!,
      at: new Date(now).toISOString(),
    }),
    state,
  )
  const old = state.members[0]!.invitationToken!
  state.members = [{ ...state.members[0]!, ...invitationFields(now) }]
  assert.equal(
    reducer(state, { type: 'invitations/accept', token: old, at: new Date(now).toISOString() }),
    state,
  )
  const action = {
    type: 'invitations/accept' as const,
    token: state.members[0]!.invitationToken!,
    at: new Date(now).toISOString(),
  }
  const accepted = reducer(state, action)
  assert.equal(reducer(accepted, action), accepted)
})

test('accepted memberships retain their target workspace for login selection', () => {
  const { state, member } = setup()
  const second = {
    ...member,
    id: 'second-membership',
    tenantId: 'target-workspace',
    status: 'invited' as const,
    ...invitationFields(now),
  }
  state.members = [member, second]
  const accepted = reducer(state, {
    type: 'invitations/accept',
    token: second.invitationToken!,
    at: new Date(now).toISOString(),
  })
  const active = accepted.members.filter((m) => m.userId === member.userId && m.status === 'active')
  assert.equal(active.find((m) => m.tenantId === second.tenantId)?.tenantId, 'target-workspace')
})
test('plan switch retains current price until the exact effective date', () => {
  const { state, sub, app } = setup()
  const scheduled = reducer(state, {
    type: 'subscriptions/changePeriod',
    id: sub.id,
    billingPeriod: 'annual',
    actor,
    at: new Date(now).toISOString(),
  })
  assert.equal(scheduled.subscriptions[0]!.billingPeriod, 'monthly')
  assert.equal(scheduled.subscriptions[0]!.price, sub.price)
  assert.equal(scheduled.subscriptions[0]!.scheduledChange?.price, app.priceAnnual)
  assert.equal(
    reducer(scheduled, { type: 'store/tick', at: '2026-09-30T23:59:59Z' }).subscriptions[0]!
      .billingPeriod,
    'monthly',
  )
  const renewed = reducer(scheduled, { type: 'store/tick', at: sub.currentPeriodEnd })
  assert.equal(renewed.subscriptions[0]!.billingPeriod, 'annual')
  assert.equal(renewed.subscriptions[0]!.price, app.priceAnnual)
  assert.equal(renewed.subscriptions[0]!.scheduledChange, null)
})
test('renewal invoice uses scheduled price and period without changing current terms', () => {
  const { state, sub, app } = setup()
  const scheduled = reducer(state, {
    type: 'subscriptions/changePeriod',
    id: sub.id,
    billingPeriod: 'annual',
    actor,
  })
  const invoiced = reducer(scheduled, { type: 'invoices/generate', subscriptionId: sub.id, actor })
  assert.equal(invoiced.invoices[0]!.lines[0]!.amount, app.priceAnnual)
  assert.equal(invoiced.invoices[0]!.billingPeriod, 'annual')
  assert.equal(invoiced.subscriptions[0]!.billingPeriod, 'monthly')
  assert.equal(
    reducer(invoiced, { type: 'subscriptions/cancelChange', id: sub.id, actor }),
    invoiced,
  )
})
test('scheduled change can be withdrawn before renewal is invoiced', () => {
  const { state, sub } = setup()
  const scheduled = reducer(state, {
    type: 'subscriptions/changePeriod',
    id: sub.id,
    billingPeriod: 'annual',
    actor,
  })
  const cancelled = reducer(scheduled, { type: 'subscriptions/cancelChange', id: sub.id, actor })
  assert.equal(cancelled.subscriptions[0]!.scheduledChange, null)
  assert.equal(cancelled.subscriptions[0]!.price, sub.price)
})
test('invoice snapshots retain the billed period and tax total', () => {
  const { sub, app } = setup()
  const invoice = buildInvoice(sub, app, {
    id: 'test',
    number: 'TEST',
    periodStart: sub.currentPeriodStart,
    issuedAt: new Date(now).toISOString(),
  })
  assert.equal(invoice.billingPeriod, 'monthly')
  assert.equal(invoice.total, sub.price + Math.round(sub.price * 0.11))
  assert.equal(invoice.dueDate, '2026-09-29T00:00:00.000Z')
})
