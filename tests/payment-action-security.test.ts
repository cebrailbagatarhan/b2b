import assert from 'node:assert/strict'
import test from 'node:test'

import { createOrder } from '../src/app/actions'

const BASE_ORDER = {
  userId: 'customer-test-id',
  items: [{ productId: 'product-test-id', unitId: 'unit-test-id', quantity: 1 }],
  idempotencyKey: '7f2aa0ea-73f0-4e72-95f0-bac0f07c68dc',
}

test('the real server action rejects card orders before reserving stock', async () => {
  const result = await createOrder({
    ...BASE_ORDER,
    paymentMethod: 'CREDIT_CARD',
  })

  assert.equal(result.success, false)
  assert.match(result.error, /ödeme sağlayıcısı/i)
})

test('the real server action rejects transfer orders without real bank reconciliation', async () => {
  const result = await createOrder({
    ...BASE_ORDER,
    paymentMethod: 'TRANSFER',
  })

  assert.equal(result.success, false)
  assert.match(result.error, /banka hesabı/i)
})
