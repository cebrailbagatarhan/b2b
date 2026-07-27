import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'

import { POST } from '../src/app/api/auth/register/route'

const mutableEnv = process.env as Record<string, string | undefined>

test('production registration rejects the fixed demo phone code', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  mutableEnv.NODE_ENV = 'production'

  try {
    const request = new NextRequest('http://127.0.0.1:3100/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Bayi',
        email: 'test-bayi@example.test',
        phone: '0532 123 45 67',
        password: 'Guclu-Test-Parolasi-42!',
        verificationCode: '123456',
      }),
    })

    const response = await POST(request)
    const body = (await response.json()) as { error?: string }

    assert.equal(response.status, 503)
    assert.match(body.error ?? '', /doğrulama sağlayıcısı/i)
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV
    else mutableEnv.NODE_ENV = originalNodeEnv
  }
})

test('production still rejects malformed phone input before provider gating', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  mutableEnv.NODE_ENV = 'production'

  try {
    const request = new NextRequest('http://127.0.0.1:3100/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Bayi',
        email: 'test-bayi@example.test',
        phone: '0212 123 45 67',
        password: 'Guclu-Test-Parolasi-42!',
        verificationCode: '123456',
      }),
    })

    const response = await POST(request)
    const body = (await response.json()) as { error?: string }

    assert.equal(response.status, 400)
    assert.match(body.error ?? '', /cep telefonu/i)
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV
    else mutableEnv.NODE_ENV = originalNodeEnv
  }
})
