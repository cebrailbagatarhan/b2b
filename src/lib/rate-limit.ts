import { createHash } from 'crypto'

type RateLimitEntry = {
  attempts: number
  resetAt: number
}

type RateLimitPolicy = {
  limit: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

const MAX_ENTRIES = 5_000
const globalRateLimit = globalThis as typeof globalThis & {
  __loginRateLimitEntries?: Map<string, RateLimitEntry>
}
const entries =
  globalRateLimit.__loginRateLimitEntries ?? new Map<string, RateLimitEntry>()

if (process.env.NODE_ENV !== 'production') {
  globalRateLimit.__loginRateLimitEntries = entries
}

function removeExpiredEntries(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key)
  }
}

function makeRoom(now: number) {
  if (entries.size < MAX_ENTRIES) return

  removeExpiredEntries(now)
  while (entries.size >= MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value as string | undefined
    if (!oldestKey) break
    entries.delete(oldestKey)
  }
}

export function opaqueRateLimitKey(namespace: string, value: string): string {
  const digest = createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('base64url')

  return `${namespace}:${digest}`
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now: number = Date.now()
): RateLimitResult {
  const current = entries.get(key)

  if (!current || current.resetAt <= now) {
    makeRoom(now)
    entries.set(key, { attempts: 1, resetAt: now + policy.windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAt - now) / 1_000)
  )

  if (current.attempts >= policy.limit) {
    return { allowed: false, retryAfterSeconds }
  }

  current.attempts += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

export function clearRateLimits(keys: readonly string[]) {
  for (const key of keys) entries.delete(key)
}
