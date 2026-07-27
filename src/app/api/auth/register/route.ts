import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { consumeRateLimit, opaqueRateLimitKey } from '@/lib/rate-limit'
import {
  hasCustomerApprovalSchema,
  hasUniqueCustomerPhoneSchema,
} from '@/lib/customer-schema-compat'
import {
  isDemoPhoneVerificationEnabled,
  isDemoPhoneVerificationCode,
  normalizeTurkeyPhone,
} from '@/lib/phone'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGISTRATION_WINDOW_MS = 60 * 60 * 1_000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const phoneRaw = typeof body.phone === 'string' ? body.phone : ''
    const verificationCode =
      typeof body.verificationCode === 'string' ? body.verificationCode : ''

    if (!name || !email || !password || !phoneRaw) {
      return NextResponse.json(
        { success: false, error: 'Ad, e-posta, telefon ve şifre gereklidir.' },
        { status: 400 }
      )
    }

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { success: false, error: 'Ad veya firma adı 2-120 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      )
    }

    const phone = normalizeTurkeyPhone(phoneRaw)
    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Geçerli bir cep telefonu girin (5XX XXX XX XX).',
        },
        { status: 400 }
      )
    }

    if (!isDemoPhoneVerificationEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Telefon doğrulama sağlayıcısı henüz yapılandırılmadı. Kayıt geçici olarak kapalıdır.',
        },
        { status: 503 }
      )
    }

    if (!isDemoPhoneVerificationCode(verificationCode)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Telefon doğrulama kodu hatalı. Demo kod: 123456 (SMS gönderilmez).',
        },
        { status: 400 }
      )
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Şifre 8-128 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    if (!(await hasUniqueCustomerPhoneSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Telefon tekilliği için veritabanı geçişi henüz tamamlanmadı.',
        },
        { status: 503 }
      )
    }

    const clientAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const emailLimit = consumeRateLimit(
      opaqueRateLimitKey('register-email', email),
      { limit: 3, windowMs: REGISTRATION_WINDOW_MS }
    )
    const phoneLimit = consumeRateLimit(
      opaqueRateLimitKey('register-phone', phone),
      { limit: 3, windowMs: REGISTRATION_WINDOW_MS }
    )
    const ipLimit = consumeRateLimit(
      opaqueRateLimitKey('register-ip', clientAddress),
      { limit: 10, windowMs: REGISTRATION_WINDOW_MS }
    )

    if (!emailLimit.allowed || !phoneLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(
        emailLimit.retryAfterSeconds,
        phoneLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    const [existingCustomer, existingAdmin, existingPhone] = await Promise.all([
      prisma.customer.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.admin.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.customer.findFirst({
        where: { phone },
        select: { id: true },
      }),
    ])

    if (existingCustomer || existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Bu e-posta adresi zaten kullanılıyor.' },
        { status: 400 }
      )
    }

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: 'Bu telefon numarası zaten kayıtlı.' },
        { status: 400 }
      )
    }

    if (!(await hasCustomerApprovalSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Yeni bayi kaydı için veritabanı geçişi henüz tamamlanmadı. Lütfen yöneticiyle iletişime geçin.',
        },
        { status: 503 }
      )
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        password: await hashPassword(password),
        status: 'PENDING_APPROVAL',
        riskLimit: 0,
        discountRate: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        pendingApproval: true,
        message:
          'Başvurunuz alındı. Hesabınız firma yöneticisi onayladıktan sonra açılacaktır.',
        application: newCustomer,
      },
      { status: 201 }
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, error: 'Bu e-posta veya telefon zaten kullanılıyor.' },
        { status: 409 }
      )
    }

    console.error('Register API error:', error)
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}
