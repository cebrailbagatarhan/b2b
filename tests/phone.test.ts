import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEMO_PHONE_VERIFICATION_CODE,
  formatTurkeyPhoneDisplay,
  isDemoPhoneVerificationEnabled,
  isDemoPhoneVerificationCode,
  normalizeTurkeyPhone,
} from '../src/lib/phone'

test('accepts common Turkish mobile formats', () => {
  assert.equal(normalizeTurkeyPhone('0532 123 45 67'), '5321234567')
  assert.equal(normalizeTurkeyPhone('5321234567'), '5321234567')
  assert.equal(normalizeTurkeyPhone('+90 532 123 45 67'), '5321234567')
  assert.equal(normalizeTurkeyPhone('0212 123 45 67'), null)
})

test('demo verification code is accepted only outside production', () => {
  assert.equal(DEMO_PHONE_VERIFICATION_CODE, '123456')
  assert.equal(isDemoPhoneVerificationEnabled('development'), true)
  assert.equal(isDemoPhoneVerificationCode('123456', 'development'), true)
  assert.equal(isDemoPhoneVerificationCode('000000', 'development'), false)
  assert.equal(isDemoPhoneVerificationEnabled('production'), false)
  assert.equal(isDemoPhoneVerificationCode('123456', 'production'), false)
})

test('formats national numbers for display', () => {
  assert.equal(formatTurkeyPhoneDisplay('5321234567'), '0532 123 45 67')
})
