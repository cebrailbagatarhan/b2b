export type CommerceReadinessProductInput = {
  id: string
  stockCode: string
  name: string
  description: string | null
  imageUrl: string | null
  stockQuantity: number
  minStockLevel: number
  category: {
    id: string
    name: string
    parentId: string | null
    _count: { children: number }
  } | null
  prices: Array<{
    id: string
    price: number
    currency: string
  }>
  units: Array<{
    id: string
    unitName: string
    multiplier: number
  }>
}

export const COMMERCE_READINESS_BLOCKER_LABELS = {
  BARCODE_NOT_MODELED: 'Barkod alanı mevcut veritabanı şemasında yok.',
  BRAND_NOT_MODELED: 'Marka alanı ve marka eşlemesi mevcut şemada yok.',
  MODEL_CODE_NOT_MODELED: 'Ana ürün/model kodu mevcut şemada yok.',
  VAT_RATE_NOT_MODELED: 'Ürün KDV oranı mevcut şemada yok.',
  DIMENSIONAL_WEIGHT_NOT_MODELED: 'Desi bilgisi mevcut şemada yok.',
  ATTRIBUTES_NOT_MODELED: 'Kategori özellikleri ve varyant değerleri mevcut şemada yok.',
  LIST_SALE_PRICE_NOT_MODELED: 'Liste fiyatı ile satış fiyatı ayrımı mevcut şemada yok.',
  STOCK_CODE_MISSING: 'Stok kodu eksik.',
  TITLE_MISSING: 'Ürün adı eksik.',
  TITLE_OVER_CHANNEL_LIMIT: 'Ürün adı kanal hazırlık sınırı olan 100 karakteri aşıyor.',
  DESCRIPTION_MISSING: 'Ürün açıklaması eksik.',
  CATEGORY_MISSING: 'Yerel kategori seçilmemiş.',
  CATEGORY_NOT_LEAF: 'Ürün alt kategorileri bulunan bir kategoriye bağlı.',
  HTTPS_IMAGE_MISSING: 'Dış sistemlerin erişebileceği HTTPS ürün görseli eksik.',
  TRY_PRICE_MISSING: 'Geçerli bir TRY fiyatı yok.',
  TRY_PRICE_AMBIGUOUS: 'Birden fazla TRY fiyatı var; hangi fiyatın kullanılacağı belirsiz.',
  STOCK_QUANTITY_INVALID: 'Stok miktarı sıfır veya daha büyük bir tam sayı değil.',
  SALES_UNIT_MISSING: 'Geçerli bir satış birimi ve çarpanı yok.',
} as const

export type CommerceReadinessBlockerCode =
  keyof typeof COMMERCE_READINESS_BLOCKER_LABELS

export const COMMERCE_CHANNELS = ['B2B', 'B2C', 'MARKETPLACE'] as const
export type CommerceChannel = (typeof COMMERCE_CHANNELS)[number]

const ALL_CHANNELS: readonly CommerceChannel[] = COMMERCE_CHANNELS
const CONSUMER_AND_MARKETPLACE: readonly CommerceChannel[] = [
  'B2C',
  'MARKETPLACE',
]

export const COMMERCE_READINESS_BLOCKER_CHANNELS: Record<
  CommerceReadinessBlockerCode,
  readonly CommerceChannel[]
> = {
  BARCODE_NOT_MODELED: ['MARKETPLACE'],
  BRAND_NOT_MODELED: ['MARKETPLACE'],
  MODEL_CODE_NOT_MODELED: ['MARKETPLACE'],
  VAT_RATE_NOT_MODELED: ALL_CHANNELS,
  DIMENSIONAL_WEIGHT_NOT_MODELED: ['MARKETPLACE'],
  ATTRIBUTES_NOT_MODELED: ['MARKETPLACE'],
  LIST_SALE_PRICE_NOT_MODELED: CONSUMER_AND_MARKETPLACE,
  STOCK_CODE_MISSING: ALL_CHANNELS,
  TITLE_MISSING: ALL_CHANNELS,
  TITLE_OVER_CHANNEL_LIMIT: ['MARKETPLACE'],
  DESCRIPTION_MISSING: CONSUMER_AND_MARKETPLACE,
  CATEGORY_MISSING: ALL_CHANNELS,
  CATEGORY_NOT_LEAF: ['MARKETPLACE'],
  HTTPS_IMAGE_MISSING: CONSUMER_AND_MARKETPLACE,
  TRY_PRICE_MISSING: ALL_CHANNELS,
  TRY_PRICE_AMBIGUOUS: ALL_CHANNELS,
  STOCK_QUANTITY_INVALID: ALL_CHANNELS,
  SALES_UNIT_MISSING: ALL_CHANNELS,
}

export const UNMODELED_CHANNEL_BLOCKER_CODES = [
  'BARCODE_NOT_MODELED',
  'BRAND_NOT_MODELED',
  'MODEL_CODE_NOT_MODELED',
  'VAT_RATE_NOT_MODELED',
  'DIMENSIONAL_WEIGHT_NOT_MODELED',
  'ATTRIBUTES_NOT_MODELED',
  'LIST_SALE_PRICE_NOT_MODELED',
] as const satisfies readonly CommerceReadinessBlockerCode[]

export type CommerceReadinessBlocker = {
  code: CommerceReadinessBlockerCode
  label: string
  kind: 'schema' | 'data'
  channels: readonly CommerceChannel[]
}

export type CommerceReadinessResult<
  TProduct extends CommerceReadinessProductInput = CommerceReadinessProductInput,
> = {
  product: TProduct
  /** Backward-compatible shorthand for marketplace readiness. */
  ready: boolean
  readyByChannel: Record<CommerceChannel, boolean>
  blockers: CommerceReadinessBlocker[]
}

export type CommerceReadinessSummary = {
  analyzedCount: number
  readyCount: number
  blockedCount: number
  readyByChannel: Record<CommerceChannel, number>
  blockedByChannel: Record<CommerceChannel, number>
  blockerCounts: Array<{
    code: CommerceReadinessBlockerCode
    label: string
    count: number
  }>
}

function blocker(
  code: CommerceReadinessBlockerCode,
  kind: CommerceReadinessBlocker['kind']
): CommerceReadinessBlocker {
  return {
    code,
    label: COMMERCE_READINESS_BLOCKER_LABELS[code],
    kind,
    channels: COMMERCE_READINESS_BLOCKER_CHANNELS[code],
  }
}

function hasHttpsImage(value: string | null): boolean {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function analyzeCommerceReadiness<
  TProduct extends CommerceReadinessProductInput,
>(product: TProduct): CommerceReadinessResult<TProduct> {
  const blockers: CommerceReadinessBlocker[] = UNMODELED_CHANNEL_BLOCKER_CODES.map(
    (code) => blocker(code, 'schema')
  )

  const stockCode = product.stockCode.trim()
  const title = product.name.trim()

  if (!stockCode) blockers.push(blocker('STOCK_CODE_MISSING', 'data'))
  if (!title) blockers.push(blocker('TITLE_MISSING', 'data'))
  if (title.length > 100) {
    blockers.push(blocker('TITLE_OVER_CHANNEL_LIMIT', 'data'))
  }
  if (!product.description?.trim()) {
    blockers.push(blocker('DESCRIPTION_MISSING', 'data'))
  }

  if (!product.category) {
    blockers.push(blocker('CATEGORY_MISSING', 'data'))
  } else if (product.category._count.children > 0) {
    blockers.push(blocker('CATEGORY_NOT_LEAF', 'data'))
  }

  if (!hasHttpsImage(product.imageUrl)) {
    blockers.push(blocker('HTTPS_IMAGE_MISSING', 'data'))
  }

  const tryPrices = product.prices.filter(
    (price) =>
      price.currency.toUpperCase() === 'TRY' &&
      Number.isFinite(price.price) &&
      price.price >= 0
  )
  if (tryPrices.length === 0) {
    blockers.push(blocker('TRY_PRICE_MISSING', 'data'))
  } else if (tryPrices.length > 1) {
    blockers.push(blocker('TRY_PRICE_AMBIGUOUS', 'data'))
  }

  if (!Number.isInteger(product.stockQuantity) || product.stockQuantity < 0) {
    blockers.push(blocker('STOCK_QUANTITY_INVALID', 'data'))
  }

  const hasValidSalesUnit = product.units.some(
    (unit) => unit.unitName.trim() && Number.isInteger(unit.multiplier) && unit.multiplier > 0
  )
  if (!hasValidSalesUnit) {
    blockers.push(blocker('SALES_UNIT_MISSING', 'data'))
  }

  const readyByChannel = Object.fromEntries(
    COMMERCE_CHANNELS.map((channel) => [
      channel,
      !blockers.some((item) => item.channels.includes(channel)),
    ])
  ) as Record<CommerceChannel, boolean>

  return {
    product,
    ready: readyByChannel.MARKETPLACE,
    readyByChannel,
    blockers,
  }
}

export function summarizeCommerceReadiness(
  results: readonly CommerceReadinessResult[]
): CommerceReadinessSummary {
  const counts = new Map<CommerceReadinessBlockerCode, number>()

  for (const result of results) {
    for (const item of result.blockers) {
      counts.set(item.code, (counts.get(item.code) ?? 0) + 1)
    }
  }

  const readyByChannel = Object.fromEntries(
    COMMERCE_CHANNELS.map((channel) => [
      channel,
      results.filter((result) => result.readyByChannel[channel]).length,
    ])
  ) as Record<CommerceChannel, number>
  const blockedByChannel = Object.fromEntries(
    COMMERCE_CHANNELS.map((channel) => [
      channel,
      results.length - readyByChannel[channel],
    ])
  ) as Record<CommerceChannel, number>
  const readyCount = readyByChannel.MARKETPLACE

  return {
    analyzedCount: results.length,
    readyCount,
    blockedCount: results.length - readyCount,
    readyByChannel,
    blockedByChannel,
    blockerCounts: Object.keys(COMMERCE_READINESS_BLOCKER_LABELS)
      .map((code) => {
        const typedCode = code as CommerceReadinessBlockerCode
        return {
          code: typedCode,
          label: COMMERCE_READINESS_BLOCKER_LABELS[typedCode],
          count: counts.get(typedCode) ?? 0,
        }
      })
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count),
  }
}

export const CATALOG_READINESS_CSV_HEADERS = [
  'Ürün ID',
  'Stok Kodu',
  'Ürün Adı',
  'Yerel Kategori',
  'Stok Miktarı',
  'Minimum Stok',
  'TRY Fiyatları',
  'Satış Birimleri',
  'Görsel URL',
  'Barkod',
  'Marka',
  'Model Kodu',
  'KDV Oranı',
  'Desi',
  'Kategori Özellikleri',
  'B2B Hazırlık Durumu',
  'B2C Hazırlık Durumu',
  'Pazaryeri Hazırlık Durumu',
  'B2B Engelleyici Kodları',
  'B2C Engelleyici Kodları',
  'Pazaryeri Engelleyici Kodları',
  'Tüm Engelleyici Açıklamaları',
] as const

export const CSV_UTF8_BOM = '\uFEFF'

function protectSpreadsheetFormula(value: string): string {
  const startsWithControl = /^[\t\r\n]/u.test(value)
  const startsLikeFormula = /^\s*[=+\-@]/u.test(value)
  return startsWithControl || startsLikeFormula ? `'${value}` : value
}

export function escapeCsvCell(
  value: string | number | boolean | null | undefined
): string {
  let normalized = ''

  if (typeof value === 'number') {
    normalized = Number.isFinite(value) ? String(value) : ''
  } else if (typeof value === 'boolean') {
    normalized = value ? 'true' : 'false'
  } else if (typeof value === 'string') {
    normalized = protectSpreadsheetFormula(value.replaceAll('\u0000', ''))
  }

  return `"${normalized.replaceAll('"', '""')}"`
}

export function encodeCsvRow(
  cells: readonly (string | number | boolean | null | undefined)[]
): string {
  return `${cells.map(escapeCsvCell).join(',')}\r\n`
}

export function catalogReadinessCsvHeader(): string {
  return encodeCsvRow(CATALOG_READINESS_CSV_HEADERS)
}

export function catalogReadinessCsvRow(
  result: CommerceReadinessResult
): string {
  const { product, blockers } = result
  const tryPrices = product.prices
    .filter((price) => price.currency.toUpperCase() === 'TRY')
    .map((price) => price.price)
    .join(' | ')
  const units = product.units
    .map((unit) => `${unit.unitName} x${unit.multiplier}`)
    .join(' | ')
  const blockerCodesFor = (channel: CommerceChannel) =>
    blockers
      .filter((item) => item.channels.includes(channel))
      .map((item) => item.code)
      .join(' | ')

  return encodeCsvRow([
    product.id,
    product.stockCode,
    product.name,
    product.category?.name ?? '',
    product.stockQuantity,
    product.minStockLevel,
    tryPrices,
    units,
    product.imageUrl ?? '',
    '', // Barkod: mevcut şemada yok.
    '', // Marka: mevcut şemada yok.
    '', // Model kodu: mevcut şemada yok.
    '', // KDV oranı: mevcut şemada yok.
    '', // Desi: mevcut şemada yok.
    '', // Kategori özellikleri: mevcut şemada yok.
    result.readyByChannel.B2B ? 'HAZIR' : 'ENGELLİ',
    result.readyByChannel.B2C ? 'HAZIR' : 'ENGELLİ',
    result.readyByChannel.MARKETPLACE ? 'HAZIR' : 'ENGELLİ',
    blockerCodesFor('B2B'),
    blockerCodesFor('B2C'),
    blockerCodesFor('MARKETPLACE'),
    blockers.map((item) => item.label).join(' | '),
  ])
}
