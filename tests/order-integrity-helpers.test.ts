import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateOrderLineAmounts,
  isCryptographicOrderKey,
  orderItemsMatch,
} from '../src/lib/order-integrity'

test('only canonical UUID v4 order keys are accepted', () => {
  assert.equal(isCryptographicOrderKey('7f2aa0ea-73f0-4e72-95f0-bac0f07c68dc'), true)
  assert.equal(isCryptographicOrderKey('7f2aa0ea-73f0-1e72-95f0-bac0f07c68dc'), false)
  assert.equal(isCryptographicOrderKey('legacy:known-order-id'), false)
  assert.equal(isCryptographicOrderKey(''), false)
})

test('line snapshot amounts are derived from base price, multiplier and discount', () => {
  assert.deepEqual(
    calculateOrderLineAmounts({
      baseUnitPrice: 12.5,
      unitMultiplier: 4,
      quantity: 3,
      discountRate: 0.1,
    }),
    {
      unitPrice: 50,
      subtotalAmount: 150,
      discountAmount: 15,
      totalAmount: 135,
    }
  )
})

test('idempotent replay requires exactly the same normalized order lines', () => {
  const requested = [
    { productId: 'p1', unitId: 'u1', quantity: 2 },
    { productId: 'p2', unitId: 'u2', quantity: 1 },
  ]

  assert.equal(
    orderItemsMatch(requested, [
      { productId: 'p2', unitId: 'u2', quantity: 1 },
      { productId: 'p1', unitId: 'u1', quantity: 2 },
    ]),
    true
  )
  assert.equal(
    orderItemsMatch(requested, [
      { productId: 'p1', unitId: 'u1', quantity: 3 },
      { productId: 'p2', unitId: 'u2', quantity: 1 },
    ]),
    false
  )
  assert.equal(
    orderItemsMatch(requested, [
      { productId: null, unitId: null, quantity: 2 },
      { productId: 'p2', unitId: 'u2', quantity: 1 },
    ]),
    false
  )
})
