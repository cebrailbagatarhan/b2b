export const CUSTOMER_STATUSES = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'SUSPENDED',
] as const

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export function parseCustomerStatus(value: unknown): CustomerStatus | null {
  return CUSTOMER_STATUSES.includes(value as CustomerStatus)
    ? (value as CustomerStatus)
    : null
}

export function getInactiveCustomerMessage(status: string): string {
  if (status === 'PENDING_APPROVAL') {
    return 'Başvurunuz henüz onaylanmadı. Firma yöneticisinin onayını bekleyin.'
  }

  if (status === 'SUSPENDED') {
    return 'Hesabınız askıya alınmıştır. Firma yöneticinizle iletişime geçin.'
  }

  return 'Hesabınız şu anda kullanıma açık değil.'
}
