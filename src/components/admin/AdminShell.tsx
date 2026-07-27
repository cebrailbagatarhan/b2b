'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import type { AdminRole } from '@/lib/session'

type AdminShellProps = {
  admin: {
    id: string
    name: string
    email: string
    adminRole: AdminRole
  }
  children: React.ReactNode
}

const allNavItems = [
  {
    name: 'Özet',
    path: '/admin',
    icon: LayoutDashboard,
    roles: ['SUPERADMIN'],
  },
  {
    name: 'Siparişler',
    path: '/admin/siparisler',
    icon: ShoppingCart,
    roles: ['SUPERADMIN', 'SALES_REP', 'WAREHOUSE', 'ACCOUNTING'],
  },
  {
    name: 'Müşteriler',
    path: '/admin/musteriler',
    icon: Users,
    roles: ['SUPERADMIN', 'SALES_REP'],
  },
  {
    name: 'Ürünler',
    path: '/admin/urunler',
    icon: Package,
    roles: ['SUPERADMIN', 'WAREHOUSE'],
  },
  {
    name: 'Kanal Hazırlığı',
    path: '/admin/kanal-hazirlik',
    icon: ListChecks,
    roles: ['SUPERADMIN', 'WAREHOUSE'],
  },
  {
    name: 'Afişler',
    path: '/admin/gorseller',
    icon: ImageIcon,
    roles: ['SUPERADMIN'],
  },
] as const

export default function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const clearClientAuth = useAuthStore((state) => state.logout)
  const navItems = allNavItems.filter((item) =>
    (item.roles as readonly AdminRole[]).includes(admin.adminRole)
  )

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout request failed')

      clearClientAuth()
      router.replace('/giris')
      router.refresh()
    } catch {
      window.alert(
        'Çıkış yapılamadı. Oturumunuz hâlâ açık; lütfen tekrar deneyin.'
      )
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <aside
        style={{
          width: '250px',
          backgroundColor: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            TopTan Yönetim
          </h2>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path

            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                  borderRight: isActive
                    ? '3px solid var(--accent-primary)'
                    : '3px solid transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div
          style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}
        >
          <div
            style={{
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>{admin.name}</strong>
            <br />
            {admin.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--danger)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
              padding: 0,
            }}
          >
            <LogOut size={18} /> Çıkış Yap
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
