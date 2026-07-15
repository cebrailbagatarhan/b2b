import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSessionToken,
  getSessionSecret,
  verifySessionToken,
  type SessionPayload,
} from '../src/lib/session'
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from '../src/lib/password'
import {
  clearRateLimits,
  consumeRateLimit,
  opaqueRateLimitKey,
} from '../src/lib/rate-limit'
import {
  categoryNameMatchesSlug,
  categoryNameToSlug,
} from '../src/lib/category-slug'

const TEST_SECRET = 'test-session-secret-with-more-than-32-characters'
const NOW = Date.UTC(2026, 6, 15)

// NODE_ENV is typed as read-only in @types/node; tests still need to simulate
// different runtime environments, so mutate through an untyped view.
const mutableEnv = process.env as Record<string, string | undefined>

function setNodeEnv(value: string | undefined) {
  if (value === undefined) delete mutableEnv.NODE_ENV
  else mutableEnv.NODE_ENV = value
}

test('signed session accepts an intact, unexpired token', () => {
  const payload: SessionPayload = {
    userId: 'customer-1',
    role: 'CUSTOMER',
    expiresAt: Math.floor(NOW / 1_000) + 60,
  }
  const token = createSessionToken(payload, TEST_SECRET)

  assert.deepEqual(verifySessionToken(token, TEST_SECRET, NOW), payload)
})

test('signed session rejects tampering and expired tokens', () => {
  const payload: SessionPayload = {
    userId: 'admin-1',
    role: 'ADMIN',
    adminRole: 'SUPERADMIN',
    expiresAt: Math.floor(NOW / 1_000) + 60,
  }
  const token = createSessionToken(payload, TEST_SECRET)
  const [encodedPayload, signature] = token.split('.')
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...payload, adminRole: 'ACCOUNTING' })
  ).toString('base64url')

  assert.equal(
    verifySessionToken(`${tamperedPayload}.${signature}`, TEST_SECRET, NOW),
    null
  )
  assert.equal(
    verifySessionToken(token, TEST_SECRET, (payload.expiresAt + 1) * 1_000),
    null
  )
  assert.ok(encodedPayload)
})

test('an anonymous request does not require a production secret', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSessionSecret = process.env.SESSION_SECRET

  setNodeEnv('production')
  delete process.env.SESSION_SECRET

  try {
    assert.equal(verifySessionToken(undefined), null)
  } finally {
    setNodeEnv(originalNodeEnv)

    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSessionSecret
  }
})

test('production rejects the documented placeholder session secret', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalSessionSecret = process.env.SESSION_SECRET

  setNodeEnv('production')
  process.env.SESSION_SECRET =
    'GENERATE_A_UNIQUE_RANDOM_VALUE_AT_LEAST_32_CHARACTERS'

  try {
    assert.throws(() => getSessionSecret(), /SESSION_SECRET/)
  } finally {
    setNodeEnv(originalNodeEnv)

    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSessionSecret
  }
})

test('new passwords are hashed and verified without plaintext storage', async () => {
  const password = 'Guclu-Test-Parolasi-42!'
  const storedPassword = await hashPassword(password)

  assert.equal(isHashedPassword(storedPassword), true)
  assert.notEqual(storedPassword, password)
  assert.equal(await verifyPassword(password, storedPassword), true)
  assert.equal(await verifyPassword('yanlis-parola', storedPassword), false)
})

test('legacy plaintext passwords can be verified for login-time migration', async () => {
  assert.equal(await verifyPassword('legacy-pass', 'legacy-pass'), true)
  assert.equal(await verifyPassword('wrong-pass', 'legacy-pass'), false)
})

test('login rate limit blocks excess attempts and can be cleared', () => {
  const key = opaqueRateLimitKey('test-login', 'User@Example.com')
  const policy = { limit: 2, windowMs: 60_000 }

  clearRateLimits([key])
  assert.equal(consumeRateLimit(key, policy, NOW).allowed, true)
  assert.equal(consumeRateLimit(key, policy, NOW + 1).allowed, true)

  const blocked = consumeRateLimit(key, policy, NOW + 2)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.retryAfterSeconds, 60)

  clearRateLimits([key])
  assert.equal(consumeRateLimit(key, policy, NOW + 3).allowed, true)
  clearRateLimits([key])
})

test('category slugs normalize Turkish names and reject malformed routes', () => {
  assert.equal(categoryNameToSlug('Bahçe Ekipmanları'), 'bahce-ekipmanlari')
  assert.equal(
    categoryNameMatchesSlug('Bahçe Ekipmanları', 'bahce-ekipmanlari'),
    true
  )
  assert.equal(categoryNameMatchesSlug('Bahçe Ekipmanları', '../bahce'), false)
})
