import { prisma } from '@/lib/prisma'
import {
  AdminRole,
  AuthorizationError,
  parseAdminRole,
  requireSession,
} from '@/lib/session'
import { getInactiveCustomerMessage } from '@/lib/customer-status'
import { getCustomerStatusForAuth } from '@/lib/customer-schema-compat'

export type VerifiedAdminSession = {
  userId: string
  role: 'ADMIN'
  adminRole: AdminRole
  name: string
  email: string
}

export type VerifiedCustomerSession = {
  userId: string
  role: 'CUSTOMER'
}

export type VerifiedSession =
  | VerifiedAdminSession
  | VerifiedCustomerSession

export async function requireVerifiedSession(): Promise<VerifiedSession> {
  const session = await requireSession()

  if (session.role === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, role: true },
    })
    const adminRole = admin ? parseAdminRole(admin.role) : null

    if (!admin || !adminRole) {
      throw new AuthorizationError('Oturum artık geçerli değil.', 401)
    }

    return {
      userId: admin.id,
      role: 'ADMIN',
      adminRole,
      name: admin.name,
      email: admin.email,
    }
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.userId },
    select: { id: true },
  })

  if (!customer) {
    throw new AuthorizationError('Oturum artık geçerli değil.', 401)
  }

  const customerStatus = await getCustomerStatusForAuth(customer.id)
  if (customerStatus !== 'ACTIVE') {
    throw new AuthorizationError(
      getInactiveCustomerMessage(customerStatus ?? 'UNKNOWN'),
      403
    )
  }

  return { userId: customer.id, role: 'CUSTOMER' }
}

export async function requireAdmin(
  allowedRoles?: readonly AdminRole[]
): Promise<VerifiedAdminSession> {
  const session = await requireVerifiedSession()

  if (session.role !== 'ADMIN') {
    throw new AuthorizationError('Bu işlem için yetkiniz yok.', 403)
  }

  if (allowedRoles && !allowedRoles.includes(session.adminRole)) {
    throw new AuthorizationError('Bu işlem için yetkiniz yok.', 403)
  }

  return session
}

export async function requireCustomerAccess(
  customerId: string
): Promise<VerifiedSession> {
  const session = await requireVerifiedSession()

  if (session.role === 'CUSTOMER') {
    if (session.userId !== customerId) {
      throw new AuthorizationError('Bu müşteri kaydına erişemezsiniz.', 403)
    }
    return session
  }

  if (session.adminRole === 'SUPERADMIN') return session

  if (session.adminRole === 'SALES_REP') {
    const assignedCustomer = await prisma.customer.findFirst({
      where: { id: customerId, salesRepId: session.userId },
      select: { id: true },
    })

    if (assignedCustomer) return session
  }

  throw new AuthorizationError('Bu müşteri kaydına erişemezsiniz.', 403)
}
