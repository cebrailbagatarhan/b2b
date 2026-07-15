import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'
import { requireAdmin } from '@/lib/authorization'

export default async function AdminDashboardPage() {
  const session = await requireAdmin([
    'SUPERADMIN',
    'SALES_REP',
    'WAREHOUSE',
    'ACCOUNTING',
  ])

  if (session.adminRole === 'WAREHOUSE') {
    redirect('/admin/urunler')
  }

  if (
    session.adminRole === 'SALES_REP' ||
    session.adminRole === 'ACCOUNTING'
  ) {
    redirect('/admin/siparisler')
  }

  return <AdminDashboardClient />
}
