import assert from 'node:assert/strict'
import test from 'node:test'

import {
  analyzeCommerceReadiness,
  catalogReadinessCsvHeader,
  catalogReadinessCsvRow,
  CSV_UTF8_BOM,
  encodeCsvRow,
  escapeCsvCell,
  summarizeCommerceReadiness,
  UNMODELED_CHANNEL_BLOCKER_CODES,
  type CommerceReadinessProductInput,
} from '../src/lib/commerce-readiness'

function product(
  overrides: Partial<CommerceReadinessProductInput> = {}
): CommerceReadinessProductInput {
  return {
    id: 'product-1',
    stockCode: 'STK-001',
    name: 'Test ürünü',
    description: 'Açıklama',
    imageUrl: 'https://cdn.example.com/product.jpg',
    stockQuantity: 12,
    minStockLevel: 2,
    category: {
      id: 'category-1',
      name: 'Alt kategori',
      parentId: 'parent-1',
      _count: { children: 0 },
    },
    prices: [{ id: 'price-1', price: 99.9, currency: 'TRY' }],
    units: [{ id: 'unit-1', unitName: 'Adet', multiplier: 1 }],
    ...overrides,
  }
}

test('reports every field that is absent from the current catalog schema', () => {
  const result = analyzeCommerceReadiness(product())

  assert.equal(result.ready, false)
  assert.equal(result.readyByChannel.B2B, false)
  assert.equal(result.readyByChannel.B2C, false)
  assert.equal(result.readyByChannel.MARKETPLACE, false)
  assert.deepEqual(
    result.blockers.filter((item) => item.kind === 'schema').map((item) => item.code),
    [...UNMODELED_CHANNEL_BLOCKER_CODES]
  )
})

test('adds product data blockers without guessing missing values', () => {
  const result = analyzeCommerceReadiness(
    product({
      stockCode: ' ',
      name: 'x'.repeat(101),
      description: null,
      imageUrl: '/uploads/local.jpg',
      stockQuantity: -1,
      category: {
        id: 'category-1',
        name: 'Üst kategori',
        parentId: null,
        _count: { children: 2 },
      },
      prices: [],
      units: [],
    })
  )
  const codes = result.blockers.map((item) => item.code)

  assert.ok(codes.includes('STOCK_CODE_MISSING'))
  assert.ok(codes.includes('TITLE_OVER_CHANNEL_LIMIT'))
  assert.ok(codes.includes('DESCRIPTION_MISSING'))
  assert.ok(codes.includes('CATEGORY_NOT_LEAF'))
  assert.ok(codes.includes('HTTPS_IMAGE_MISSING'))
  assert.ok(codes.includes('TRY_PRICE_MISSING'))
  assert.ok(codes.includes('STOCK_QUANTITY_INVALID'))
  assert.ok(codes.includes('SALES_UNIT_MISSING'))
})

test('summarizes blocker counts across analyzed products', () => {
  const summary = summarizeCommerceReadiness([
    analyzeCommerceReadiness(product()),
    analyzeCommerceReadiness(product({ id: 'product-2', description: null })),
  ])

  assert.equal(summary.analyzedCount, 2)
  assert.equal(summary.readyCount, 0)
  assert.equal(summary.blockedCount, 2)
  assert.equal(summary.readyByChannel.B2B, 0)
  assert.equal(summary.readyByChannel.B2C, 0)
  assert.equal(summary.readyByChannel.MARKETPLACE, 0)
  assert.equal(
    summary.blockerCounts.find((item) => item.code === 'BARCODE_NOT_MODELED')?.count,
    2
  )
  assert.equal(
    summary.blockerCounts.find((item) => item.code === 'DESCRIPTION_MISSING')?.count,
    1
  )
})

test('CSV encoding uses CRLF, quotes embedded characters and blocks formulas', () => {
  assert.equal(escapeCsvCell('normal, "değer"\nalt'), '"normal, ""değer""\nalt"')
  assert.equal(escapeCsvCell('=2+3'), '"\'=2+3"')
  assert.equal(escapeCsvCell('  +cmd'), '"\'  +cmd"')
  assert.equal(escapeCsvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"')
  assert.equal(encodeCsvRow(['a', 'b']).endsWith('\r\n'), true)
  assert.equal(CSV_UTF8_BOM.codePointAt(0), 0xfeff)
})

test('CSV row leaves unmodeled fields empty and includes blocker codes', () => {
  const result = analyzeCommerceReadiness(product({ name: '=WEBSERVICE("bad")' }))
  const header = catalogReadinessCsvHeader()
  const row = catalogReadinessCsvRow(result)

  assert.ok(header.includes('"Barkod"'))
  assert.ok(header.includes('"B2B Hazırlık Durumu"'))
  assert.ok(row.includes('"\'=WEBSERVICE(""bad"")"'))
  assert.ok(row.includes('BARCODE_NOT_MODELED'))
  assert.ok(row.includes('VAT_RATE_NOT_MODELED'))
  assert.ok(row.includes('"ENGELLİ"'))
})
