import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE_NAME = 'toptan_session'
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export type AdminRole =
  | 'SUPERADMIN'
  | 'SALES_REP'
  | 'WAREHOUSE'
  | 'ACCOUNTING'

const ADMIN_ROLES: readonly AdminRole[] = [
  'SUPERADMIN',
  'SALES_REP',
  'WAREHOUSE',
  'ACCOUNTING',
]

export type SessionPayload = {
  userId: string
  role: 'ADMIN' | 'CUSTOMER'
  adminRole?: AdminRole
  expiresAt: number
}

const globalForDevelopmentSecret = globalThis as typeof globalThis & {
  __toptanDevelopmentSessionSecret?: string
}
const DEVELOPMENT_SECRET =
  globalForDevelopmentSecret.__toptanDevelopmentSessionSecret ??
  randomBytes(32).toString('base64url')

if (!globalForDevelopmentSecret.__toptanDevelopmentSessionSecret) {
  // Next.js dev routes can load separate module bundles in the same process.
  // Keep one process-wide fallback so a cookie signed by the login route can
  // also be verified by a page/API bundle. Production still requires env config.
  globalForDevelopmentSecret.__toptanDevelopmentSessionSecret = DEVELOPMENT_SECRET
}
const REJECTED_SESSION_SECRETS = new Set([
  'replace-with-at-least-32-random-characters',
  'GENERATE_A_UNIQUE_RANDOM_VALUE_AT_LEAST_32_CHARACTERS',
])

export class AuthorizationError extends Error {
  status: 401 | 403

  constructor(message: string, status: 401 | 403) {
    super(message)
    this.name = 'AuthorizationError'
    this.status = status
  }
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim()

  if (
    secret &&
    secret.length >= 32 &&
    !REJECTED_SESSION_SECRETS.has(secret)
  ) {
    return secret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET üretim ortamında en az 32 karakter olmalıdır.'
    )
  }

  return DEVELOPMENT_SECRET
}

function signatureFor(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload).digest()
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<SessionPayload>
  const hasValidRole = payload.role === 'ADMIN' || payload.role === 'CUSTOMER'
  const hasValidAdminRole =
    payload.adminRole === undefined || parseAdminRole(payload.adminRole) !== null

  return (
    typeof payload.userId === 'string' &&
    payload.userId.length > 0 &&
    hasValidRole &&
    hasValidAdminRole &&
    typeof payload.expiresAt === 'number' &&
    Number.isSafeInteger(payload.expiresAt)
  )
}

export function parseAdminRole(value: string): AdminRole | null {
  return ADMIN_ROLES.includes(value as AdminRole) ? (value as AdminRole) : null
}

export function createSessionToken(
  payload: SessionPayload,
  secret: string = getSessionSecret()
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url'
  )
  const signature = signatureFor(encodedPayload, secret).toString('base64url')

  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(
  token: string | undefined,
  secret?: string,
  now: number = Date.now()
): SessionPayload | null {
  if (!token) return null

  const signingSecret = secret ?? getSessionSecret()

  const [encodedPayload, encodedSignature, extraPart] = token.split('.')
  if (!encodedPayload || !encodedSignature || extraPart !== undefined) return null

  try {
    const suppliedSignature = Buffer.from(encodedSignature, 'base64url')
    const expectedSignature = signatureFor(encodedPayload, signingSecret)

    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null
    }

    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as unknown

    if (!isSessionPayload(parsed)) return null
    if (parsed.expiresAt <= Math.floor(now / 1_000)) return null

    return parsed
  } catch {
    return null
  }
}

export async function createSession(
  user: Omit<SessionPayload, 'expiresAt'>
): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1_000) + SESSION_MAX_AGE_SECONDS
  const token = createSessionToken({ ...user, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  return verifySessionToken(token)
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()

  if (!session) {
    throw new AuthorizationError('Oturum açmanız gerekiyor.', 401)
  }

  return session
}
