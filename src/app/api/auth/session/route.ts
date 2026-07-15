import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireVerifiedSession } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'

export async function GET() {
  try {
    const session = await requireVerifiedSession()

    if (session.role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, role: true },
      })

      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Oturum geçersiz.' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          adminRole: session.adminRole,
          role: 'ADMIN',
        },
      })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        companyCode: true,
        balance: true,
        discountRate: true,
        riskLimit: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Oturum geçersiz.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { ...customer, role: 'CUSTOMER' },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}
