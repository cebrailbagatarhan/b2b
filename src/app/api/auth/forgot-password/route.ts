import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  buildPasswordResetUrl,
  createPasswordResetRawToken,
  hashPasswordResetToken,
  sendPasswordResetEmail,
} from '@/lib/email'
import { consumeRateLimit, opaqueRateLimitKey } from '@/lib/rate-limit'
import { hasPasswordResetTokenSchema } from '@/lib/password-reset-schema'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WINDOW_MS = 60 * 60 * 1_000
const TOKEN_TTL_MS = 30 * 60 * 1_000

const GENERIC_OK =
  'Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      )
    }

    const clientAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'

    const emailLimit = consumeRateLimit(
      opaqueRateLimitKey('forgot-email', email),
      { limit: 5, windowMs: WINDOW_MS }
    )
    const ipLimit = consumeRateLimit(
      opaqueRateLimitKey('forgot-ip', clientAddress),
      { limit: 20, windowMs: WINDOW_MS }
    )

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    if (!(await hasPasswordResetTokenSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Şifre sıfırlama için veritabanı geçişi henüz uygulanmadı. Yöneticiyle iletişime geçin.',
        },
        { status: 503 }
      )
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    // Always same message (no account enumeration)
    if (!customer) {
      return NextResponse.json({ success: true, message: GENERIC_OK })
    }

    const rawToken = createPasswordResetRawToken()
    const tokenHash = hashPasswordResetToken(rawToken)
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.deleteMany({
      where: { customerId: customer.id, usedAt: null },
    })

    await prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt,
      },
    })

    const resetUrl = buildPasswordResetUrl(rawToken)
    const { delivered } = await sendPasswordResetEmail({
      to: customer.email,
      name: customer.name,
      resetUrl,
    })

    const payload: {
      success: true
      message: string
      resetUrl?: string
    } = {
      success: true,
      message: delivered
        ? GENERIC_OK
        : `${GENERIC_OK} (SMTP yok: bağlantı sunucu logunda; geliştirmede aşağıda da gösterilir.)`,
    }

    // Dev convenience when SMTP is not configured
    if (!delivered && process.env.NODE_ENV !== 'production') {
      payload.resetUrl = resetUrl
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('forgot-password error', error)
    return NextResponse.json(
      { success: false, error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
