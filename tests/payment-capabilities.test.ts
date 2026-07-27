import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getPaymentMethodAvailability,
  isPaymentMethod,
} from '../src/lib/payment-capabilities'

test('only known payment methods pass runtime validation', () => {
  assert.equal(isPaymentMethod('CREDIT_CARD'), true)
  assert.equal(isPaymentMethod('TRANSFER'), true)
  assert.equal(isPaymentMethod('OPEN_ACCOUNT'), true)
  assert.equal(isPaymentMethod('FREE'), false)
  assert.equal(isPaymentMethod(null), false)
})

test('unfinished external payment methods fail closed', () => {
  const card = getPaymentMethodAvailability('CREDIT_CARD')
  const transfer = getPaymentMethodAvailability('TRANSFER')
  const openAccount = getPaymentMethodAvailability('OPEN_ACCOUNT')

  assert.equal(card.enabled, false)
  assert.match(card.reason ?? '', /ödeme sağlayıcısı/i)
  assert.equal(transfer.enabled, false)
  assert.match(transfer.reason ?? '', /banka hesabı/i)
  assert.deepEqual(openAccount, { enabled: true, reason: null })
})
