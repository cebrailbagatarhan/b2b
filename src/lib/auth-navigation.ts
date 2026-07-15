type AuthenticatedIdentity = {
  role: 'ADMIN' | 'CUSTOMER'
  adminRole?: string | null
}

const ADMIN_LANDING_PAGES: Readonly<Record<string, string>> = {
  SUPERADMIN: '/admin',
  SALES_REP: '/admin/siparisler',
  WAREHOUSE: '/admin/urunler',
  ACCOUNTING: '/admin/siparisler',
}

export function getAuthenticatedHomePath(
  user: AuthenticatedIdentity
): string {
  if (user.role === 'CUSTOMER') return '/'

  return ADMIN_LANDING_PAGES[user.adminRole ?? ''] ?? '/admin'
}
