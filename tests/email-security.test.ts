import assert from 'node:assert/strict'
import test from 'node:test'

import { sendMail } from '../src/lib/email'

const SECRET_TOKEN = 'reset-secret-token-never-log'
const SECRET_URL = `https://example.test/sifre-sifirla?token=${SECRET_TOKEN}`
const MAIL = {
  to: 'customer@example.test',
  subject: 'Password reset',
  text: `Open this private reset link:\n${SECRET_URL}`,
}

const mutableEnv = process.env as Record<string, string | undefined>
const ENV_KEYS = [
  'NODE_ENV',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM',
  'SMTP_USER',
  'SMTP_PASS',
] as const

function withEmailEnv(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  action: () => Promise<void>
): Promise<void> {
  const original = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
  ) as Record<(typeof ENV_KEYS)[number], string | undefined>

  for (const key of ENV_KEYS) delete mutableEnv[key]
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) mutableEnv[key] = value
  }

  return action().finally(() => {
    for (const key of ENV_KEYS) {
      const value = original[key]
      if (value === undefined) delete mutableEnv[key]
      else mutableEnv[key] = value
    }
  })
}

async function captureConsole(
  action: () => Promise<void>
): Promise<string> {
  const original = {
    info: console.info,
    warn: console.warn,
    error: console.error,
  }
  const entries: unknown[] = []
  const capture = (...values: unknown[]) => entries.push(...values)

  console.info = capture
  console.warn = capture
  console.error = capture

  try {
    await action()
  } finally {
    console.info = original.info
    console.warn = original.warn
    console.error = original.error
  }

  return entries.map(String).join('\n')
}

function assertNoSensitiveMailContent(logs: string): void {
  assert.doesNotMatch(logs, /reset-secret-token-never-log/)
  assert.doesNotMatch(logs, /sifre-sifirla\?token=/)
  assert.doesNotMatch(logs, /Open this private reset link/)
}

test('production does not log reset content when SMTP is missing', async () => {
  await withEmailEnv({ NODE_ENV: 'production' }, async () => {
    let result: { delivered: boolean } | undefined
    const logs = await captureConsole(async () => {
      result = await sendMail(MAIL)
    })

    assert.deepEqual(result, { delivered: false })
    assert.match(logs, /SMTP is not configured/)
    assertNoSensitiveMailContent(logs)
  })
})

test('production does not log reset content when nodemailer is unavailable', async () => {
  await withEmailEnv(
    {
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.test',
      SMTP_FROM: 'no-reply@example.test',
    },
    async () => {
      const logs = await captureConsole(async () => {
        const result = await sendMail(MAIL, {
          loadNodemailer: async () => null,
        })
        assert.deepEqual(result, { delivered: false })
      })

      assert.match(logs, /nodemailer is not installed/)
      assertNoSensitiveMailContent(logs)
    }
  )
})

test('production sanitizes both mail and thrown error details', async () => {
  await withEmailEnv(
    {
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.test',
      SMTP_FROM: 'no-reply@example.test',
    },
    async () => {
      const logs = await captureConsole(async () => {
        const result = await sendMail(MAIL, {
          loadNodemailer: async () => ({
            createTransport: () => ({
              sendMail: async () => {
                throw new Error(`provider rejected ${SECRET_URL}`)
              },
            }),
          }),
        })
        assert.deepEqual(result, { delivered: false })
      })

      assert.match(logs, /error details were not logged/)
      assertNoSensitiveMailContent(logs)
    }
  )
})

test('development keeps the local mail preview when SMTP is missing', async () => {
  await withEmailEnv({ NODE_ENV: 'development' }, async () => {
    const logs = await captureConsole(async () => {
      const result = await sendMail(MAIL)
      assert.deepEqual(result, { delivered: false })
    })

    assert.match(logs, /\[email:dev\]/)
    assert.match(logs, new RegExp(SECRET_TOKEN))
  })
})

test('configured transport still receives and delivers the original mail', async () => {
  await withEmailEnv(
    {
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.test',
      SMTP_FROM: 'no-reply@example.test',
    },
    async () => {
      let sentMessage: unknown
      const logs = await captureConsole(async () => {
        const result = await sendMail(MAIL, {
          loadNodemailer: async () => ({
            createTransport: () => ({
              sendMail: async (message) => {
                sentMessage = message
              },
            }),
          }),
        })

        assert.deepEqual(result, { delivered: true })
      })

      assert.deepEqual(sentMessage, {
        from: 'no-reply@example.test',
        ...MAIL,
      })
      assert.equal(logs, '')
    }
  )
})
