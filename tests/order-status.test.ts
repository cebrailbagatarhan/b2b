import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  canCustomerCancelOrder,
  canRoleSetStatus,
  cancellationEffects,
  isTransitionAllowed,
  nextStatusesFor,
  parseOrderStatus,
} from '../src/lib/order-status'

test('every status has a Turkish label and parses back', () => {
  for (const status of ORDER_STATUSES) {
    assert.ok(ORDER_STATUS_LABELS[status].length > 0)
    assert.equal(parseOrderStatus(status), status)
  }
  assert.equal(parseOrderStatus('HACKED'), null)
  assert.equal(parseOrderStatus(42), null)
})

test('fulfillment follows the expected forward path', () => {
  assert.ok(isTransitionAllowed('PENDING_TRANSFER', 'APPROVED'))
  assert.ok(isTransitionAllowed('APPROVED', 'PROCESSING'))
  assert.ok(isTransitionAllowed('PROCESSING', 'SHIPPED'))
  assert.ok(isTransitionAllowed('SHIPPED', 'DELIVERED'))

  // No skipping steps or going backwards.
  assert.equal(isTransitionAllowed('PENDING_PAYMENT', 'SHIPPED'), false)
  assert.equal(isTransitionAllowed('SHIPPED', 'PROCESSING'), false)
  assert.equal(isTransitionAllowed('APPROVED', 'PENDING_PAYMENT'), false)
})

test('terminal statuses cannot be changed', () => {
  for (const terminal of ['DELIVERED', 'COMPLETED', 'CANCELLED'] as const) {
    assert.deepEqual(nextStatusesFor(terminal), [])
  }
})

test('shipped orders can no longer be cancelled', () => {
  assert.equal(isTransitionAllowed('SHIPPED', 'CANCELLED'), false)
  assert.ok(isTransitionAllowed('PROCESSING', 'CANCELLED'))
})

test('customers can only cancel unpaid and unprocessed orders', () => {
  assert.equal(canCustomerCancelOrder('PENDING_PAYMENT'), true)
  assert.equal(canCustomerCancelOrder('PENDING_TRANSFER'), true)
  assert.equal(canCustomerCancelOrder('APPROVED'), false)
  assert.equal(canCustomerCancelOrder('PROCESSING'), false)
  assert.equal(canCustomerCancelOrder('SHIPPED'), false)
  assert.equal(canCustomerCancelOrder('CANCELLED'), false)
})

test('roles only reach the statuses they own', () => {
  // Accounting confirms payments, nothing else.
  assert.ok(canRoleSetStatus('ACCOUNTING', 'APPROVED'))
  assert.equal(canRoleSetStatus('ACCOUNTING', 'SHIPPED'), false)
  assert.equal(canRoleSetStatus('ACCOUNTING', 'CANCELLED'), false)

  // Warehouse handles physical fulfillment, no money movements.
  assert.ok(canRoleSetStatus('WAREHOUSE', 'PROCESSING'))
  assert.ok(canRoleSetStatus('WAREHOUSE', 'SHIPPED'))
  assert.ok(canRoleSetStatus('WAREHOUSE', 'DELIVERED'))
  assert.equal(canRoleSetStatus('WAREHOUSE', 'APPROVED'), false)
  assert.equal(canRoleSetStatus('WAREHOUSE', 'CANCELLED'), false)

  // Sales reps cannot change order state at all.
  assert.equal(canRoleSetStatus('SALES_REP', 'APPROVED'), false)

  // Superadmin can do everything except fabricate legacy states.
  assert.ok(canRoleSetStatus('SUPERADMIN', 'CANCELLED'))
  assert.equal(canRoleSetStatus('SUPERADMIN', 'PAID'), false)
})

test('cancellation restores stock and only reverses open-account balances', () => {
  const openAccount = cancellationEffects({
    paymentMethod: 'OPEN_ACCOUNT',
    totalAmount: 1250.5,
  })
  assert.equal(openAccount.restoreStock, true)
  assert.equal(openAccount.balanceDelta, -1250.5)

  const transfer = cancellationEffects({
    paymentMethod: 'TRANSFER',
    totalAmount: 900,
  })
  assert.equal(transfer.balanceDelta, 0)
})
