import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuthenticatedHomePath } from '../src/lib/auth-navigation'
import {
  getRestoredLoginDestination,
  shouldSyncRestoredPage,
} from '../src/lib/auth-session-restore'

test('customer login returns to the storefront', () => {
  assert.equal(getAuthenticatedHomePath({ role: 'CUSTOMER' }), '/')
})

test('each admin role lands on an authorized panel page', () => {
  assert.equal(
    getAuthenticatedHomePath({ role: 'ADMIN', adminRole: 'SUPERADMIN' }),
    '/admin'
  )
  assert.equal(
    getAuthenticatedHomePath({ role: 'ADMIN', adminRole: 'SALES_REP' }),
    '/admin/siparisler'
  )
  assert.equal(
    getAuthenticatedHomePath({ role: 'ADMIN', adminRole: 'WAREHOUSE' }),
    '/admin/urunler'
  )
  assert.equal(
    getAuthenticatedHomePath({ role: 'ADMIN', adminRole: 'ACCOUNTING' }),
    '/admin/siparisler'
  )
})

test('an unexpected admin role falls back to the protected admin root', () => {
  assert.equal(
    getAuthenticatedHomePath({ role: 'ADMIN', adminRole: 'UNKNOWN' }),
    '/admin'
  )
})

test('only a persisted pageshow event triggers restored-session sync', () => {
  assert.equal(shouldSyncRestoredPage(false), false)
  assert.equal(shouldSyncRestoredPage(true), true)
})

test('a verified restored login page returns to the role landing page', () => {
  assert.equal(
    getRestoredLoginDestination(true, '/giris', {
      role: 'ADMIN',
      adminRole: 'WAREHOUSE',
    }),
    '/admin/urunler'
  )
  assert.equal(
    getRestoredLoginDestination(true, '/giris', { role: 'CUSTOMER' }),
    '/'
  )
  assert.equal(
    getRestoredLoginDestination(false, '/giris', { role: 'CUSTOMER' }),
    null
  )
  assert.equal(
    getRestoredLoginDestination(true, '/sepet', { role: 'CUSTOMER' }),
    null
  )
})
