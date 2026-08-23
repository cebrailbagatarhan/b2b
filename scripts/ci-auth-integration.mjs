import { spawn } from 'node:child_process'

const host = '127.0.0.1'
const port = 3100
const baseUrl = `http://${host}:${port}`
const nextCommand = process.platform === 'win32'\n  ? 'node_modules\\\\.bin\\\\next.cmd'\n  : 'node_modules/.bin/next'
const logChunks = []

const server = spawn(
  nextCommand,
  ['start', '--hostname', host, '--port', String(port)],
  {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  }
)

function capture(chunk) {
  logChunks.push(chunk.toString())
  if (logChunks.join('').length > 30_000) logChunks.shift()
}

server.stdout.on('data', capture)
server.stderr.on('data', capture)

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitUntilReady() {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before becoming ready.\n${logChunks.join('')}`)
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        signal: AbortSignal.timeout(3_000),
      })
      if (response.status === 200) return
    } catch {
      // The production server is still starting.
    }

    await delay(500)
  }

  throw new Error(`Server did not become ready.\n${logChunks.join('')}`)
}

async function expectJson(path, expectedStatus, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
  })
  const body = await response.json()

  if (response.status !== expectedStatus) {
    throw new Error(
      `${path}: expected HTTP ${expectedStatus}, got ${response.status}: ${JSON.stringify(body)}`
    )
  }

  return body
}

async function stopServer() {
  if (server.exitCode !== null) return

  server.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(5_000),
  ])

  if (server.exitCode === null) server.kill('SIGKILL')
}

try {
  await waitUntilReady()

  const health = await expectJson('/api/health', 200)
  if (health.status !== 'ok' || health.services?.database !== 'ok') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`)
  }

  for (const path of ['/api/auth/session', '/api/admin/customers']) {
    const body = await expectJson(path, 401)
    if (body.success !== false) {
      throw new Error(`${path}: unauthenticated response was not a failure`)
    }
  }

  const tampered = await expectJson('/api/auth/session', 401, {
    headers: { cookie: 'toptan_session=eyJmb28iOiJiYXIifQ.invalid' },
  })
  if (tampered.success !== false) {
    throw new Error('Tampered session cookie was not rejected')
  }

  const upload = await expectJson('/api/upload', 401, {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=ci-check' },
    body: '--ci-check--\r\n',
  })
  if (upload.success !== false) {
    throw new Error('Unauthenticated upload was not rejected')
  }

  console.log('Auth integration checks passed.')
} catch (error) {
  console.error(error)
  console.error(logChunks.join(''))
  process.exitCode = 1
} finally {
  await stopServer()
}
