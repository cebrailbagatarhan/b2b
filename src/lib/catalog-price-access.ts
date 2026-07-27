/**
 * Removes dealer prices before a product record crosses the server boundary.
 * Prisma relations are ordinary arrays; the generic cast only preserves the
 * caller's product shape after replacing that array with an empty one.
 */
export function redactProductPrices<T extends { prices: unknown[] }>(
  product: T
): T {
  return { ...product, prices: [] } as T
}

export function redactProductsPrices<T extends { prices: unknown[] }>(
  products: readonly T[]
): T[] {
  return products.map(redactProductPrices)
}
