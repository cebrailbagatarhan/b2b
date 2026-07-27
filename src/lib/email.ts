import { createHash, randomBytes } from 'crypto'

export function createPasswordResetRawToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashPasswordResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function getAppBaseUrl(): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  return 'http://127.0.0.1:3100'
}

export function buildPasswordResetUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/sifre-sifirla?token=${encodeURIComponent(rawToken)}`
}

type SendMailInput = {
  to: string
  subject: string
  text: string
}

type NodemailerLike = {
  createTransport(options: {
    host: string
    port: number
    secure: boolean
    auth?: { user: string; pass: string }
  }): {
    sendMail(message: {
      from: string
      to: string
      subject: string
      text: string
    }): Promise<unknown>
  }
}

type SendMailDependencies = {
  loadNodemailer?: () => Promise<NodemailerLike | null>
}

function logMailForDevelopment(input: SendMailInput, label: string): void {
  if (process.env.NODE_ENV === 'production') return

  console.info(
    `[${label}] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}`
  )
}

async function loadNodemailer(): Promise<NodemailerLike | null> {
  return import('nodemailer').catch(() => null)
}

/**
 * Sends mail when SMTP_* is configured.
 * Without SMTP, logs the message (local/dev) and returns delivered=false.
 */
export async function sendMail(
  input: SendMailInput,
  dependencies: SendMailDependencies = {}
): Promise<{ delivered: boolean }> {
  const host = process.env.SMTP_HOST?.trim()
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim()

  if (!host || !from) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[email] SMTP is not configured; message was not sent.')
    }
    logMailForDevelopment(input, 'email:dev')
    return { delivered: false }
  }

  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  // Lightweight SMTP via nodemailer is not a dependency yet — use fetch to a
  // provider later. For now use Node's built-in approach only when SMTP is set
  // through a simple HTTP email bridge, otherwise log.
  // Prefer nodemailer if present.
  try {
    const nodemailer = await (dependencies.loadNodemailer ?? loadNodemailer)()
    if (!nodemailer) {
      console.warn(
        '[email] SMTP configured but nodemailer is not installed; message was not sent.'
      )
      logMailForDevelopment(input, 'email:fallback')
      return { delivered: false }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    })

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    })
    return { delivered: true }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[email] send failed; message and error details were not logged.'
      )
    } else {
      console.error('[email] send failed', error)
    }
    logMailForDevelopment(input, 'email:fallback')
    return { delivered: false }
  }
}

export async function sendPasswordResetEmail(options: {
  to: string
  name: string
  resetUrl: string
}): Promise<{ delivered: boolean }> {
  const text = [
    `Merhaba ${options.name},`,
    '',
    'TopTan Market hesabınız için şifre sıfırlama talebi aldık.',
    'Aşağıdaki bağlantı 30 dakika geçerlidir:',
    '',
    options.resetUrl,
    '',
    'Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.',
  ].join('\n')

  return sendMail({
    to: options.to,
    subject: 'TopTan Market — Şifre sıfırlama',
    text,
  })
}
