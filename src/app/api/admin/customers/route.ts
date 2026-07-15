import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'
import { hasCustomerApprovalSchema } from '@/lib/customer-schema-compat'

export async function GET() {
  try {
    const session = await requireAdmin(['SUPERADMIN', 'SALES_REP'])
    const canManageTerms = session.adminRole === 'SUPERADMIN'

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

    const [customers, salesReps] = await Promise.all([
      prisma.customer.findMany({
        where:
          session.adminRole === 'SALES_REP'
            ? { salesRepId: session.userId }
            : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          companyCode: true,
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
        },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
      canManageTerms
        ? prisma.admin.findMany({
            where: { role: 'SALES_REP' },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      success: true,
      customers,
      salesReps,
      permissions: { canManageTerms },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}
