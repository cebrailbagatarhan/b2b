import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from '@/lib/password'
import {
  createCredentialVersion,
  createSession,
  parseAdminRole,
} from '@/lib/session'
import { getInactiveCustomerMessage } from '@/lib/customer-status'
import { getCustomerStatusForAuth } from '@/lib/customer-schema-compat'
import {
  clearRateLimits,
  consumeRateLimit,
  opaqueRateLimitKey,
} from '@/lib/rate-limit'

const INVALID_CREDENTIALS = 'E-posta veya şifre hatalı.'
const LOGIN_WINDOW_MS = 15 * 60 * 1_000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-posta ve şifre gereklidir.' },
        { status: 400 }
      )
    }

    const clientAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'
    const rateLimitKeys = [
      opaqueRateLimitKey('login-email', email),
      opaqueRateLimitKey('login-ip', clientAddress),
    ]
    const emailLimit = consumeRateLimit(rateLimitKeys[0], {
      limit: 5,
      windowMs: LOGIN_WINDOW_MS,
    })
    const ipLimit = consumeRateLimit(rateLimitKeys[1], {
      limit: 25,
      windowMs: LOGIN_WINDOW_MS,
    })

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      )
      return NextResponse.json(
        {
          success: false,
          error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    // First check Admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    })

    if (admin) {
      const passwordMatches = await verifyPassword(password, admin.password)
      if (!passwordMatches) {
        return NextResponse.json(
          { success: false, error: INVALID_CREDENTIALS },
          { status: 401 }
        )
      }

      const adminRole = parseAdminRole(admin.role)
      if (!adminRole) {
        return NextResponse.json(
          { success: false, error: 'Hesap rolü geçersiz.' },
          { status: 403 }
        )
      }

      let storedPassword = admin.password
      if (!isHashedPassword(storedPassword)) {
        storedPassword = await hashPassword(password)
        await prisma.admin.update({
          where: { id: admin.id },
          data: { password: storedPassword },
        })
      }

      await createSession({
        userId: admin.id,
        role: 'ADMIN',
        adminRole,
        credentialVersion: createCredentialVersion(storedPassword),
      })
      clearRateLimits(rateLimitKeys)

      return NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          adminRole,
          role: 'ADMIN',
        },
      })
    }

    // Then check Customer
    const customer = await prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        companyCode: true,
        balance: true,
        discountRate: true,
        riskLimit: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const passwordMatches = await verifyPassword(password, customer.password)
    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const customerStatus = await getCustomerStatusForAuth(customer.id)
    if (customerStatus !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: getInactiveCustomerMessage(customerStatus ?? 'UNKNOWN'),
        },
        { status: 403 }
      )
    }

    let storedPassword = customer.password
    if (!isHashedPassword(storedPassword)) {
      storedPassword = await hashPassword(password)
      await prisma.customer.update({
        where: { id: customer.id },
        data: { password: storedPassword },
      })
    }

    await createSession({
      userId: customer.id,
      role: 'CUSTOMER',
      credentialVersion: createCredentialVersion(storedPassword),
    })
    clearRateLimits(rateLimitKeys)

    return NextResponse.json({
      success: true,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        companyCode: customer.companyCode,
        balance: customer.balance,
        discountRate: customer.discountRate,
        riskLimit: customer.riskLimit,
        role: 'CUSTOMER',
      },
    })
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}
