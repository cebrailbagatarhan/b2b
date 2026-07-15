import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuthenticatedHomePath } from '../src/lib/auth-navigation'

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
