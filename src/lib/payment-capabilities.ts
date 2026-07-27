export const PAYMENT_METHODS = [
  'CREDIT_CARD',
  'TRANSFER',
  'OPEN_ACCOUNT',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type PaymentMethodAvailability = {
  enabled: boolean
  reason: string | null
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod)
}

/**
 * Only methods with a complete server-side settlement flow may create an
 * order. Card payments need a hosted payment provider + verified webhook;
 * transfers need real, reviewed bank details and a reconciliation process.
 * Neither exists yet, so accepting them would reserve stock indefinitely.
 */
export function getPaymentMethodAvailability(
  method: PaymentMethod
): PaymentMethodAvailability {
  if (method === 'CREDIT_CARD') {
    return {
      enabled: false,
      reason:
        'Kredi kartı ödemesi, güvenli ödeme sağlayıcısı ve doğrulanmış webhook tamamlanana kadar kullanılamaz.',
    }
  }

  if (method === 'TRANSFER') {
    return {
      enabled: false,
      reason:
        'Havale/EFT, gerçek banka hesabı ve ödeme mutabakatı tamamlanana kadar kullanılamaz.',
    }
  }

  return { enabled: true, reason: null }
}
