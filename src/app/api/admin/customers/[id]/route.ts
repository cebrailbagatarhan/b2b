import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'
import { parseCustomerStatus } from '@/lib/customer-status'
import { hasCustomerApprovalSchema } from '@/lib/customer-schema-compat'

const MAX_RISK_LIMIT = 1_000_000_000
const MAX_COMPANY_CODE_LENGTH = 64
const MUTABLE_FIELDS = new Set([
  'status',
  'companyCode',
  'riskLimit',
  'discountRate',
  'salesRepId',
])

const customerSelect = {
  id: true,
  name: true,
  email: true,
  companyCode: true,
  taxId: true,
  status: true,
  balance: true,
  discountRate: true,
  riskLimit: true,
  salesRepId: true,
  salesRep: {
    select: { id: true, name: true, email: true },
  },
  createdAt: true,
  updatedAt: true,
} as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key)
}

function invalidRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await requireAdmin(['SUPERADMIN', 'SALES_REP'])

    if (!(await hasCustomerApprovalSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Müşteri onay ekranı için veritabanı geçişi henüz tamamlanmadı.',
        },
        { status: 503 }
      )
    }

    if (!id || id.length > 128) {
      return invalidRequest('Müşteri kimliği geçersiz.')
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: customerSelect,
    })

    if (
      !customer ||
      (session.adminRole === 'SALES_REP' &&
        customer.salesRepId !== session.userId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Müşteri bulunamadı.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      customer,
      permissions: {
        canManageTerms: session.adminRole === 'SUPERADMIN',
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireAdmin(['SUPERADMIN'])

    if (!(await hasCustomerApprovalSchema())) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Müşteri onay işlemi için veritabanı geçişi henüz tamamlanmadı.',
        },
        { status: 503 }
      )
    }

    if (!id || id.length > 128) {
      return invalidRequest('Müşteri kimliği geçersiz.')
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return invalidRequest('Geçerli bir JSON gövdesi gönderin.')
    }

    if (!isPlainObject(rawBody)) {
      return invalidRequest('Müşteri ayarları geçersiz.')
    }

    const keys = Object.keys(rawBody)
    if (keys.length === 0 || keys.some((key) => !MUTABLE_FIELDS.has(key))) {
      return invalidRequest('Değiştirilebilir müşteri alanları geçersiz.')
    }

    const existing = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        companyCode: true,
        riskLimit: true,
        discountRate: true,
        salesRepId: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Müşteri bulunamadı.' },
        { status: 404 }
      )
    }

    const updateData: {
      status?: string
      companyCode?: string | null
      riskLimit?: number
      discountRate?: number
      salesRepId?: string | null
    } = {}

    let nextStatus = existing.status
    if (hasOwn(rawBody, 'status')) {
      const parsedStatus = parseCustomerStatus(rawBody.status)
      if (!parsedStatus || parsedStatus === 'PENDING_APPROVAL') {
        return invalidRequest(
          'Durum yalnızca ACTIVE veya SUSPENDED olarak değiştirilebilir.'
        )
      }
      nextStatus = parsedStatus
      updateData.status = parsedStatus
    }

    let nextCompanyCode = existing.companyCode
    if (hasOwn(rawBody, 'companyCode')) {
      if (rawBody.companyCode === null || rawBody.companyCode === '') {
        nextCompanyCode = null
        updateData.companyCode = null
      } else if (typeof rawBody.companyCode === 'string') {
        const companyCode = rawBody.companyCode.trim()
        if (
          !companyCode ||
          companyCode.length > MAX_COMPANY_CODE_LENGTH ||
          /[\u0000-\u001f\u007f]/.test(companyCode)
        ) {
          return invalidRequest('Firma kodu 1-64 geçerli karakter içermelidir.')
        }
        nextCompanyCode = companyCode
        updateData.companyCode = companyCode
      } else {
        return invalidRequest('Firma kodu geçersiz.')
      }
    }

    if (nextStatus === 'ACTIVE' && !nextCompanyCode) {
      return invalidRequest('Hesabı aktifleştirmek için firma kodu gereklidir.')
    }

    if (hasOwn(rawBody, 'riskLimit')) {
      if (
        typeof rawBody.riskLimit !== 'number' ||
        !Number.isFinite(rawBody.riskLimit) ||
        rawBody.riskLimit < 0 ||
        rawBody.riskLimit > MAX_RISK_LIMIT
      ) {
        return invalidRequest(
          `Risk limiti 0-${MAX_RISK_LIMIT.toLocaleString('tr-TR')} arasında olmalıdır.`
        )
      }
      updateData.riskLimit = rawBody.riskLimit
    }

    if (hasOwn(rawBody, 'discountRate')) {
      if (
        typeof rawBody.discountRate !== 'number' ||
        !Number.isFinite(rawBody.discountRate) ||
        rawBody.discountRate < 0 ||
        rawBody.discountRate > 1
      ) {
        return invalidRequest('İskonto oranı 0 ile 1 arasında olmalıdır.')
      }
      updateData.discountRate = rawBody.discountRate
    }

    if (hasOwn(rawBody, 'salesRepId')) {
      if (rawBody.salesRepId === null || rawBody.salesRepId === '') {
        updateData.salesRepId = null
      } else if (
        typeof rawBody.salesRepId === 'string' &&
        rawBody.salesRepId.length <= 128
      ) {
        const salesRep = await prisma.admin.findFirst({
          where: { id: rawBody.salesRepId, role: 'SALES_REP' },
          select: { id: true },
        })
        if (!salesRep) {
          return invalidRequest('Seçilen satış temsilcisi geçersiz.')
        }
        updateData.salesRepId = salesRep.id
      } else {
        return invalidRequest('Satış temsilcisi geçersiz.')
      }
    }

    if (nextCompanyCode) {
      const duplicateCompanyCode = await prisma.customer.findFirst({
        where: {
          companyCode: nextCompanyCode,
          NOT: { id },
        },
        select: { id: true },
      })
      if (duplicateCompanyCode) {
        return NextResponse.json(
          { success: false, error: 'Bu firma kodu başka bir müşteride kullanılıyor.' },
          { status: 409 }
        )
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: customerSelect,
    })

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    console.error('Error updating customer:', error)
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}
