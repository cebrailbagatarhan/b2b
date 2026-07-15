import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInactiveCustomerMessage,
  parseCustomerStatus,
} from '../src/lib/customer-status'

test('only known customer statuses are accepted', () => {
  assert.equal(parseCustomerStatus('PENDING_APPROVAL'), 'PENDING_APPROVAL')
  assert.equal(parseCustomerStatus('ACTIVE'), 'ACTIVE')
  assert.equal(parseCustomerStatus('SUSPENDED'), 'SUSPENDED')
  assert.equal(parseCustomerStatus('active'), null)
  assert.equal(parseCustomerStatus('UNKNOWN'), null)
  assert.equal(parseCustomerStatus(null), null)
})

test('inactive account messages do not grant access', () => {
  assert.match(getInactiveCustomerMessage('PENDING_APPROVAL'), /onaylanmadı/i)
  assert.match(getInactiveCustomerMessage('SUSPENDED'), /askıya/i)
  assert.match(getInactiveCustomerMessage('UNKNOWN'), /açık değil/i)
})
