import 'server-only'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  analyzeCommerceReadiness,
  summarizeCommerceReadiness,
} from '@/lib/commerce-readiness'

const commerceReadinessProductSelect = {
  id: true,
  stockCode: true,
  name: true,
  description: true,
  imageUrl: true,
  stockQuantity: true,
  minStockLevel: true,
  category: {
    select: {
      id: true,
      name: true,
      parentId: true,
      _count: { select: { children: true } },
    },
  },
  prices: {
    select: {
      id: true,
      price: true,
      currency: true,
    },
    orderBy: { id: 'asc' },
  },
  units: {
    select: {
      id: true,
      unitName: true,
      multiplier: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ProductSelect

export type CommerceReadinessProductRecord = Prisma.ProductGetPayload<{
  select: typeof commerceReadinessProductSelect
}>

export async function getCommerceReadinessSnapshot(limit = 1_000) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 1_000) : 1_000

  const [totalCatalogCount, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      take: safeLimit,
      orderBy: { id: 'asc' },
      select: commerceReadinessProductSelect,
    }),
  ])
  const results = products.map(analyzeCommerceReadiness)

  return {
    totalCatalogCount,
    results,
    summary: summarizeCommerceReadiness(results),
    truncated: totalCatalogCount > products.length,
  }
}

export async function* iterateCommerceReadinessProducts(
  batchSize = 200
): AsyncGenerator<CommerceReadinessProductRecord[]> {
  const safeBatchSize = Number.isInteger(batchSize)
    ? Math.min(Math.max(batchSize, 1), 500)
    : 200
  let cursor: string | undefined

  while (true) {
    const products = await prisma.product.findMany({
      take: safeBatchSize,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: commerceReadinessProductSelect,
    })

    if (products.length === 0) return

    yield products

    if (products.length < safeBatchSize) return
    cursor = products[products.length - 1].id
  }
}
