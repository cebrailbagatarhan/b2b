import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { hashPasswordResetToken } from '@/lib/email'
import { consumeRateLimit, opaqueRateLimitKey } from '@/lib/rate-limit'
import { hasPasswordResetTokenSchema } from '@/lib/password-reset-schema'

const WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!token || token.length < 20 || token.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veya eksik sıfırlama bağlantısı.' },
        { status: 400 }
      )
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Şifre 8-128 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    const clientAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const ipLimit = consumeRateLimit(
      opaqueRateLimitKey('reset-ip', clientAddress),
      { limit: 20, windowMs: WINDOW_MS }
    )
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) },
        }
      )
    }

    if (!(await hasPasswordResetTokenSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Şifre sıfırlama için veritabanı geçişi henüz uygulanmadı.',
        },
        { status: 503 }
      )
    }

    const tokenHash = hashPasswordResetToken(token)
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        customerId: true,
        expiresAt: true,
        usedAt: true,
      },
    })

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bu bağlantının süresi dolmuş veya geçersiz. Yeni talep oluşturun.',
        },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: record.customerId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          customerId: record.customerId,
          usedAt: null,
          id: { not: record.id },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
    })
  } catch (error) {
    console.error('reset-password error', error)
    return NextResponse.json(
      { success: false, error: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
