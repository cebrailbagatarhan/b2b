import { redirect } from 'next/navigation'
import { requireVerifiedSession } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'
import { getCustomerAccount } from '@/app/actions'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  let session
  try {
    session = await requireVerifiedSession()
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/giris')
    }
    throw error
  }

  if (session.role === 'ADMIN') {
    redirect('/admin')
  }

  const result = await getCustomerAccount(session.userId)
  if (!result.success) {
    return (
      <div className="container" style={{ padding: '3rem 0', minHeight: '50vh' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Hesabım</h1>
        <p style={{ marginTop: '1rem', color: '#b91c1c' }}>{result.error}</p>
      </div>
    )
  }

  return (
    <div
      className="container"
      style={{
        paddingTop: 'var(--spacing-2xl)',
        paddingBottom: 'var(--spacing-2xl)',
        minHeight: '50vh',
      }}
    >
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Hesabım
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Profil, cari durum, teslimat adresleri ve son siparişleriniz.
        </p>
      </div>

      <AccountClient
        customer={result.customer}
        recentOrders={result.recentOrders}
      />
    </div>
  )
}
