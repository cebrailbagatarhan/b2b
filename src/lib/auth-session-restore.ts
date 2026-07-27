import { getAuthenticatedHomePath } from '@/lib/auth-navigation'

type VerifiedUser = {
  role: 'ADMIN' | 'CUSTOMER'
  adminRole?: string | null
}

export function shouldSyncRestoredPage(persisted: boolean): boolean {
  return persisted
}

export function getRestoredLoginDestination(
  redirectRestoredLogin: boolean,
  pathname: string,
  user: VerifiedUser
): string | null {
  if (!redirectRestoredLogin || pathname !== '/giris') return null
  return getAuthenticatedHomePath(user)
}
