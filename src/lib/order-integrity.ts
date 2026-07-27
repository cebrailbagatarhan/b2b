export type NormalizedOrderItem = {
  productId: string
  unitId: string
  quantity: number
}

export type PersistedOrderItemIdentity = {
  productId: string | null
  unitId: string | null
  quantity: number
}

export type ShippingSnapshotIdentity = {
  shippingTitle?: string | null
  shippingFullName?: string | null
  shippingPhone?: string | null
  shippingCity?: string | null
  shippingDistrict?: string | null
  shippingAddressLine?: string | null
  shippingPostalCode?: string | null
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCryptographicOrderKey(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value)
}

export function calculateOrderLineAmounts(input: {
  baseUnitPrice: number
  unitMultiplier: number
  quantity: number
  discountRate: number
}) {
  const roundCurrency = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100

  const unitPrice = roundCurrency(input.baseUnitPrice * input.unitMultiplier)
  const subtotalAmount = roundCurrency(unitPrice * input.quantity)
  const discountAmount = roundCurrency(subtotalAmount * input.discountRate)
  const totalAmount = roundCurrency(subtotalAmount - discountAmount)

  return {
    unitPrice,
    subtotalAmount,
    discountAmount,
    totalAmount,
  }
}

export function orderItemsMatch(
  requestedItems: readonly NormalizedOrderItem[],
  persistedItems: readonly PersistedOrderItemIdentity[]
) {
  if (requestedItems.length !== persistedItems.length) return false

  const persistedByIdentity = new Map(
    persistedItems.map((item) => [
      item.productId && item.unitId ? `${item.productId}:${item.unitId}` : '',
      item.quantity,
    ])
  )

  if (persistedByIdentity.has('') || persistedByIdentity.size !== persistedItems.length) {
    return false
  }

  return requestedItems.every(
    (item) =>
      persistedByIdentity.get(`${item.productId}:${item.unitId}`) === item.quantity
  )
}

const SHIPPING_SNAPSHOT_FIELDS = [
  'shippingTitle',
  'shippingFullName',
  'shippingPhone',
  'shippingCity',
  'shippingDistrict',
  'shippingAddressLine',
  'shippingPostalCode',
] as const satisfies readonly (keyof ShippingSnapshotIdentity)[]

/**
 * An idempotency key identifies the complete order intent, including the
 * immutable delivery snapshot. Missing legacy columns normalize to null.
 */
export function shippingSnapshotsMatch(
  requested: ShippingSnapshotIdentity | null,
  persisted: object
) {
  const persistedSnapshot = persisted as ShippingSnapshotIdentity
  return SHIPPING_SNAPSHOT_FIELDS.every(
    (field) =>
      (requested?.[field] ?? null) === (persistedSnapshot[field] ?? null)
  )
}
