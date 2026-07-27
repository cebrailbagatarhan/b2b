/**
 * Demo-only phone verification. Real SMS is intentionally disabled until a
 * provider is wired; the fixed code lets registration stay testable.
 */
export const DEMO_PHONE_VERIFICATION_CODE = '123456'

export function isDemoPhoneVerificationEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv !== 'production'
}

export function normalizeTurkeyPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  let national = digits

  if (national.startsWith('90') && national.length === 12) {
    national = national.slice(2)
  }
  if (national.startsWith('0') && national.length === 11) {
    national = national.slice(1)
  }

  // Turkish mobile numbers are 10 digits and start with 5.
  if (!/^5\d{9}$/.test(national)) return null
  return national
}

export function formatTurkeyPhoneDisplay(national: string): string {
  if (national.length !== 10) return national
  return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8)}`
}

export function isDemoPhoneVerificationCode(
  code: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return (
    isDemoPhoneVerificationEnabled(nodeEnv) &&
    code.trim() === DEMO_PHONE_VERIFICATION_CODE
  )
}
