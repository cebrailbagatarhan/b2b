import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session
  try {
    session = await requireAdmin([
      'SUPERADMIN',
      'SALES_REP',
      'WAREHOUSE',
      'ACCOUNTING',
    ])
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/giris')
    }
    throw error
  }

  return (
    <AdminShell
      admin={{
        id: session.userId,
        name: session.name,
        email: session.email,
        adminRole: session.adminRole,
      }}
    >
      {children}
    </AdminShell>
  )
}
