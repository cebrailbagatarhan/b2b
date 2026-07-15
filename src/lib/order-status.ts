import type { AdminRole } from '@/lib/session'

/**
 * Canonical order statuses. PENDING, PAID and COMPLETED only exist on legacy
 * rows (mock/demo data); new orders start at one of the PENDING_* states or
 * APPROVED (open account).
 */
export const ORDER_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT',
  'PENDING_TRANSFER',
  'APPROVED',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Bekliyor',
  PENDING_PAYMENT: 'Ödeme bekliyor',
  PENDING_TRANSFER: 'Havale bekliyor',
  APPROVED: 'Onaylandı',
  PAID: 'Ödendi',
  PROCESSING: 'Hazırlanıyor',
  SHIPPED: 'Kargoya verildi',
  DELIVERED: 'Teslim edildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
}

export function parseOrderStatus(value: unknown): OrderStatus | null {
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : null
}

/**
 * Allowed forward transitions. DELIVERED, COMPLETED and CANCELLED are
 * terminal; a cancelled or delivered order can only be changed by a manual,
 * audited database operation.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  PENDING_PAYMENT: ['APPROVED', 'CANCELLED'],
  PENDING_TRANSFER: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  COMPLETED: [],
  CANCELLED: [],
}

export function isTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function nextStatusesFor(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_TRANSITIONS[from]
}

/**
 * Payment confirmation (→ APPROVED) belongs to accounting, physical
 * fulfillment (→ PROCESSING/SHIPPED/DELIVERED) to the warehouse.
 * Cancellation reverses stock and open-account balance, so it stays with
 * SUPERADMIN only.
 */
export function canRoleSetStatus(role: AdminRole, to: OrderStatus): boolean {
  if (role === 'SUPERADMIN') return to !== 'PENDING' && to !== 'PAID' && to !== 'COMPLETED'

  if (role === 'ACCOUNTING') return to === 'APPROVED'

  if (role === 'WAREHOUSE') {
    return to === 'PROCESSING' || to === 'SHIPPED' || to === 'DELIVERED'
  }

  return false
}

/**
 * A cancellation must return reserved stock. Balance is only reversed for
 * open-account orders because that is the only method that charged the
 * customer inside createOrder.
 */
export function cancellationEffects(order: {
  paymentMethod: string
  totalAmount: number
}): { restoreStock: true; balanceDelta: number } {
  return {
    restoreStock: true,
    balanceDelta:
      order.paymentMethod === 'OPEN_ACCOUNT' ? -order.totalAmount : 0,
  }
}
