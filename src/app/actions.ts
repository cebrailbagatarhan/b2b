'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  requireCustomerAccess,
  requireVerifiedSession,
} from '@/lib/authorization'
import { AuthorizationError, deleteSession } from '@/lib/session'
import { categoryNameMatchesSlug } from '@/lib/category-slug'
import {
  calculateOrderLineAmounts,
  isCryptographicOrderKey,
  orderItemsMatch,
  shippingSnapshotsMatch,
} from '@/lib/order-integrity'
import {
  getPaymentMethodAvailability,
  isPaymentMethod,
  type PaymentMethod,
} from '@/lib/payment-capabilities'
import {
  canCustomerCancelOrder,
  parseOrderStatus,
} from '@/lib/order-status'
import {
  hasAddressSchema,
  hasCustomerApprovalSchema,
  hasCustomerPhoneSchema,
  hasOrderIntegritySchema,
} from '@/lib/customer-schema-compat'
import { hashPassword, verifyPassword } from '@/lib/password'
import { isValidTurkeyLocation } from '@/lib/turkey-locations'
import {
  redactProductPrices,
  redactProductsPrices,
} from '@/lib/catalog-price-access'

async function canViewCatalogPrices(): Promise<boolean> {
  try {
    await requireVerifiedSession()
    return true
  } catch (error) {
    if (error instanceof AuthorizationError) return false
    throw error
  }
}

// ─── Categories ───
export async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    if (typeof slug !== 'string' || slug.length > 80) return null
    const canViewPrices = await canViewCatalogPrices()

    // Slug'ı Türkçe isme çevir (basit mapping)
    const nameMap: Record<string, string> = {
      'hirdavat': 'Hırdavat',
      'oyuncak': 'Oyuncak',
      'kirtasiye': 'Kırtasiye',
      'zuccaciye': 'Züccaciye',
      'kozmetik': 'Kozmetik',
      'tekstil': 'Tekstil',
    }
    const name = nameMap[slug.toLowerCase()]
    if (!name) return null

    const category = await prisma.category.findFirst({
      where: { name },
      include: {
        children: true,
        products: {
          include: { prices: true, units: true },
        },
      },
    })
    if (!category || canViewPrices) return category

    return {
      ...category,
      products: redactProductsPrices(category.products),
    }
  } catch (error) {
    console.error('Error fetching category:', error)
    return null
  }
}

export async function getChildCategoryBySlugs(parentSlug: string, childSlug: string) {
  try {
    if (
      typeof parentSlug !== 'string' ||
      typeof childSlug !== 'string' ||
      parentSlug.length > 80 ||
      childSlug.length > 80
    ) return null
    const canViewPrices = await canViewCatalogPrices()

    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true },
    })
    const parentCategory = rootCategories.find((category) =>
      categoryNameMatchesSlug(category.name, parentSlug)
    )

    if (!parentCategory) return null

    const childCategories = await prisma.category.findMany({
      where: { parentId: parentCategory.id },
      select: { id: true, name: true },
    })
    const childCategory = childCategories.find((category) =>
      categoryNameMatchesSlug(category.name, childSlug)
    )

    if (!childCategory) return null

    const category = await prisma.category.findFirst({
      where: {
        id: childCategory.id,
        parentId: parentCategory.id,
      },
      include: {
        parent: true,
        products: {
          include: { prices: true, units: true },
        },
      },
    })

    if (!category?.parent) return null

    return {
      ...category,
      parent: category.parent,
      products: canViewPrices
        ? category.products
        : redactProductsPrices(category.products),
    }
  } catch (error) {
    console.error('Error fetching child category:', error)
    return null
  }
}

// ─── Products ───
export async function getProducts(categoryId?: string) {
  try {
    if (categoryId && (typeof categoryId !== 'string' || categoryId.length > 128)) {
      return []
    }
    const canViewPrices = await canViewCatalogPrices()

    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        prices: true,
        units: true,
        category: true,
      },
    })
    return canViewPrices ? products : redactProductsPrices(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export async function getProductById(id: string) {
  try {
    if (typeof id !== 'string' || !id.trim() || id.length > 128) return null
    const canViewPrices = await canViewCatalogPrices()

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        prices: true,
        units: true,
        category: {
          include: { parent: true },
        },
      },
    })
    if (!product || canViewPrices) return product
    return redactProductPrices(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function searchProducts(query: string) {
  try {
    if (typeof query !== 'string') return []
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2 || normalizedQuery.length > 100) return []
    const canViewPrices = await canViewCatalogPrices()

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: normalizedQuery } },
          { stockCode: { contains: normalizedQuery } },
          { description: { contains: normalizedQuery } },
        ],
      },
      include: {
        prices: true,
        units: true,
        category: true,
      },
      take: 20,
    })
    return canViewPrices ? products : redactProductsPrices(products)
  } catch (error) {
    console.error('Error searching products:', error)
    return []
  }
}

export async function getProductsByStockCodes(codes: string[]) {
  try {
    if (!Array.isArray(codes) || codes.length === 0 || codes.length > 100) {
      return []
    }
    const normalizedCodes = [...new Set(
      codes
        .filter((code): code is string => typeof code === 'string')
        .map((code) => code.trim())
        .filter((code) => code.length > 0 && code.length <= 64)
    )]
    if (normalizedCodes.length === 0) return []
    const canViewPrices = await canViewCatalogPrices()

    const products = await prisma.product.findMany({
      where: {
        stockCode: { in: normalizedCodes }
      },
      include: {
        prices: true,
        units: true,
      }
    })
    return canViewPrices ? products : redactProductsPrices(products)
  } catch (error) {
    console.error('Error fetching by stock codes:', error)
    return []
  }
}

// ─── Addresses ───
const MAX_ADDRESSES_PER_CUSTOMER = 20

export type AddressInput = {
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  addressLine: string
  postalCode?: string
  isDefault?: boolean
}

function normalizeAddressInput(data: unknown): AddressInput {
  if (!data || typeof data !== 'object') {
    throw new OrderValidationError('Adres bilgileri geçersiz.')
  }

  const input = data as Partial<AddressInput>
  const requireText = (value: unknown, label: string, maxLength: number) => {
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text || text.length > maxLength) {
      throw new OrderValidationError(`${label} alanı geçersiz.`)
    }
    return text
  }

  const phone = requireText(input.phone, 'Telefon', 32)
  if (!/^[0-9+()\s-]{7,32}$/.test(phone)) {
    throw new OrderValidationError('Telefon numarası geçersiz.')
  }

  const postalCode =
    typeof input.postalCode === 'string' && input.postalCode.trim()
      ? input.postalCode.trim()
      : undefined
  if (postalCode && (postalCode.length > 16 || !/^[0-9A-Za-z\s-]+$/.test(postalCode))) {
    throw new OrderValidationError('Posta kodu geçersiz.')
  }

  const city = requireText(input.city, 'İl', 80)
  const district = requireText(input.district, 'İlçe', 80)
  if (!isValidTurkeyLocation(city, district)) {
    throw new OrderValidationError(
      'İl ve ilçe gerçek bir Türkiye konumuna ait olmalıdır.'
    )
  }

  return {
    title: requireText(input.title, 'Adres başlığı', 80),
    fullName: requireText(input.fullName, 'Ad soyad', 160),
    phone,
    city,
    district,
    addressLine: requireText(input.addressLine, 'Adres', 512),
    postalCode,
    isDefault: input.isDefault === true,
  }
}

export async function getAddresses(userId: string) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    if (!(await hasAddressSchema())) {
      return { success: true as const, schemaReady: false as const, addresses: [] }
    }

    const addresses = await prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        fullName: true,
        phone: true,
        city: true,
        district: true,
        addressLine: true,
        postalCode: true,
        isDefault: true,
      },
    })

    return { success: true as const, schemaReady: true as const, addresses }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error fetching addresses:', error)
    return { success: false as const, error: 'Adresler yüklenemedi.' }
  }
}

export async function createAddress(userId: string, data: AddressInput) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    if (!(await hasAddressSchema())) {
      return {
        success: false as const,
        error: 'Adres altyapısı için veritabanı geçişi henüz tamamlanmadı.',
      }
    }

    const address = normalizeAddressInput(data)

    const created = await prisma.$transaction(async (transaction) => {
      const addressCount = await transaction.address.count({
        where: { customerId },
      })
      if (addressCount >= MAX_ADDRESSES_PER_CUSTOMER) {
        throw new OrderValidationError(
          `Bir müşteri en fazla ${MAX_ADDRESSES_PER_CUSTOMER} adres kaydedebilir.`
        )
      }

      const makeDefault = address.isDefault || addressCount === 0
      if (makeDefault) {
        await transaction.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        })
      }

      return transaction.address.create({
        data: {
          customerId,
          title: address.title,
          fullName: address.fullName,
          phone: address.phone,
          city: address.city,
          district: address.district,
          addressLine: address.addressLine,
          postalCode: address.postalCode,
          isDefault: makeDefault,
        },
        select: {
          id: true,
          title: true,
          fullName: true,
          phone: true,
          city: true,
          district: true,
          addressLine: true,
          postalCode: true,
          isDefault: true,
        },
      })
    })

    return { success: true as const, address: created }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error creating address:', error)
    return { success: false as const, error: 'Adres kaydedilemedi.' }
  }
}

export async function deleteAddress(userId: string, addressId: string) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    if (!(await hasAddressSchema())) {
      return {
        success: false as const,
        error: 'Adres altyapısı için veritabanı geçişi henüz tamamlanmadı.',
      }
    }
    if (typeof addressId !== 'string' || !addressId.trim() || addressId.length > 128) {
      return { success: false as const, error: 'Adres kimliği geçersiz.' }
    }

    // Delete is scoped to the verified customer, so a foreign id is a no-op.
    const result = await prisma.address.deleteMany({
      where: { id: addressId, customerId },
    })
    if (result.count === 0) {
      return { success: false as const, error: 'Adres bulunamadı.' }
    }

    return { success: true as const }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error deleting address:', error)
    return { success: false as const, error: 'Adres silinemedi.' }
  }
}

// ─── Orders ───

type OrderItemInput = {
  productId: string
  unitId: string
  quantity: number
}

const MAX_ORDER_LINES = 100
const MAX_ITEM_QUANTITY = 100_000

class OrderValidationError extends Error {}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function validateCustomerId(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 128) {
    throw new OrderValidationError('Geçerli bir müşteri kimliği gereklidir.')
  }

  return value.trim()
}

function validateIdempotencyKey(value: unknown) {
  if (!isCryptographicOrderKey(value)) {
    throw new OrderValidationError(
      'Sipariş güvenlik anahtarı geçersiz. Sayfayı yenileyip tekrar deneyin.'
    )
  }

  return value
}

function normalizeOrderItems(value: unknown): OrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OrderValidationError('Sipariş sepeti boş olamaz.')
  }
  if (value.length > MAX_ORDER_LINES) {
    throw new OrderValidationError(`Bir sipariş en fazla ${MAX_ORDER_LINES} satır içerebilir.`)
  }

  const groupedItems = new Map<string, OrderItemInput>()

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new OrderValidationError('Sipariş satırı geçersiz.')
    }

    const item = rawItem as Partial<OrderItemInput>
    const productId = typeof item.productId === 'string' ? item.productId.trim() : ''
    const unitId = typeof item.unitId === 'string' ? item.unitId.trim() : ''

    if (!productId || !unitId || productId.length > 128 || unitId.length > 128) {
      throw new OrderValidationError('Ürün veya birim bilgisi geçersiz.')
    }
    if (
      !Number.isSafeInteger(item.quantity) ||
      (item.quantity as number) < 1 ||
      (item.quantity as number) > MAX_ITEM_QUANTITY
    ) {
      throw new OrderValidationError(
        `Ürün adedi 1 ile ${MAX_ITEM_QUANTITY} arasında tam sayı olmalıdır.`
      )
    }

    const key = `${productId}:${unitId}`
    const previous = groupedItems.get(key)
    const quantity = (previous?.quantity ?? 0) + (item.quantity as number)

    if (!Number.isSafeInteger(quantity) || quantity > MAX_ITEM_QUANTITY) {
      throw new OrderValidationError(`Aynı ürün için toplam adet ${MAX_ITEM_QUANTITY} sınırını aşamaz.`)
    }

    groupedItems.set(key, { productId, unitId, quantity })
  }

  return [...groupedItems.values()]
}

export async function createOrder(data: {
  userId: string
  items: OrderItemInput[]
  paymentMethod: PaymentMethod
  idempotencyKey: string
  addressId?: string
}) {
  try {
    const customerId = validateCustomerId(data?.userId)
    const items = normalizeOrderItems(data?.items)
    const idempotencyKey = validateIdempotencyKey(data?.idempotencyKey)

    if (!isPaymentMethod(data?.paymentMethod)) {
      throw new OrderValidationError('Ödeme yöntemi geçersiz.')
    }
    const paymentAvailability = getPaymentMethodAvailability(data.paymentMethod)
    if (!paymentAvailability.enabled) {
      throw new OrderValidationError(
        paymentAvailability.reason ?? 'Ödeme yöntemi kullanılamıyor.'
      )
    }

    const session = await requireCustomerAccess(customerId)
    if (!(await hasOrderIntegritySchema())) {
      throw new OrderValidationError(
        'Sipariş altyapısı için veritabanı geçişi henüz tamamlanmadı.'
      )
    }

    // Address becomes mandatory once the address migration is applied.
    // Before that cutover, orders keep working without one.
    const addressSchemaReady = await hasAddressSchema()
    let shippingSnapshot: {
      shippingTitle: string
      shippingFullName: string
      shippingPhone: string
      shippingCity: string
      shippingDistrict: string
      shippingAddressLine: string
      shippingPostalCode: string | null
    } | null = null

    if (addressSchemaReady) {
      const addressId =
        typeof data?.addressId === 'string' ? data.addressId.trim() : ''
      if (!addressId || addressId.length > 128) {
        throw new OrderValidationError('Sipariş için teslimat adresi seçmelisiniz.')
      }

      const address = await prisma.address.findFirst({
        where: { id: addressId, customerId },
        select: {
          title: true,
          fullName: true,
          phone: true,
          city: true,
          district: true,
          addressLine: true,
          postalCode: true,
        },
      })
      if (!address) {
        throw new OrderValidationError('Seçilen teslimat adresi bulunamadı.')
      }

      shippingSnapshot = {
        shippingTitle: address.title,
        shippingFullName: address.fullName,
        shippingPhone: address.phone,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingAddressLine: address.addressLine,
        shippingPostalCode: address.postalCode,
      }
    }
    const salesRepId =
      session.role === 'ADMIN' && session.adminRole === 'SALES_REP'
        ? session.userId
        : undefined

    const findExistingOrder = () =>
      prisma.order.findUnique({
        where: {
          customerId_idempotencyKey: { customerId, idempotencyKey },
        },
        select: {
          id: true,
          paymentMethod: true,
          ...(addressSchemaReady
            ? {
                shippingTitle: true,
                shippingFullName: true,
                shippingPhone: true,
                shippingCity: true,
                shippingDistrict: true,
                shippingAddressLine: true,
                shippingPostalCode: true,
              }
            : {}),
          items: {
            select: { productId: true, unitId: true, quantity: true },
          },
        },
      })

    const returnExistingOrder = async () => {
      const existingOrder = await findExistingOrder()
      if (!existingOrder) return null

      if (
        existingOrder.paymentMethod !== data.paymentMethod ||
        !orderItemsMatch(items, existingOrder.items) ||
        !shippingSnapshotsMatch(shippingSnapshot, existingOrder)
      ) {
        throw new OrderValidationError(
          'Bu sipariş güvenlik anahtarı farklı bir sepet veya teslimat adresi için daha önce kullanılmış. Sayfayı yenileyin.'
        )
      }

      return {
        success: true as const,
        orderId: existingOrder.id,
        idempotentReplay: true as const,
      }
    }

    const executeTransaction = () =>
      prisma.$transaction(
        async (transaction) => {
        const customer = await transaction.customer.findUnique({
          where: { id: customerId },
          select: {
            id: true,
            status: true,
            balance: true,
            discountRate: true,
            riskLimit: true,
            salesRepId: true,
          },
        })

        if (!customer) {
          throw new OrderValidationError('Müşteri bulunamadı.')
        }
        if (customer.status !== 'ACTIVE') {
          throw new AuthorizationError(
            'Sipariş verebilmek için müşteri hesabınızın aktif olması gerekir.',
            403
          )
        }
        if (
          session.role === 'ADMIN' &&
          session.adminRole === 'SALES_REP' &&
          customer.salesRepId !== session.userId
        ) {
          throw new AuthorizationError('Bu müşteri için sipariş oluşturamazsınız.', 403)
        }
        if (
          !Number.isFinite(customer.discountRate) ||
          customer.discountRate < 0 ||
          customer.discountRate > 1
        ) {
          throw new OrderValidationError('Müşteri iskonto oranı geçersiz.')
        }

        const existingOrder = await transaction.order.findUnique({
          where: {
            customerId_idempotencyKey: { customerId, idempotencyKey },
          },
          select: {
            id: true,
            paymentMethod: true,
            ...(addressSchemaReady
              ? {
                  shippingTitle: true,
                  shippingFullName: true,
                  shippingPhone: true,
                  shippingCity: true,
                  shippingDistrict: true,
                  shippingAddressLine: true,
                  shippingPostalCode: true,
                }
              : {}),
            items: {
              select: { productId: true, unitId: true, quantity: true },
            },
          },
        })
        if (existingOrder) {
          if (
            existingOrder.paymentMethod !== data.paymentMethod ||
            !orderItemsMatch(items, existingOrder.items) ||
            !shippingSnapshotsMatch(shippingSnapshot, existingOrder)
          ) {
            throw new OrderValidationError(
              'Bu sipariş güvenlik anahtarı farklı bir sepet veya teslimat adresi için daha önce kullanılmış. Sayfayı yenileyin.'
            )
          }

          return {
            success: true as const,
            orderId: existingOrder.id,
            idempotentReplay: true as const,
          }
        }

        const productIds = [...new Set(items.map((item) => item.productId))]
        const unitIds = [...new Set(items.map((item) => item.unitId))]
        const products = await transaction.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            stockCode: true,
            stockQuantity: true,
            prices: {
              where: { currency: 'TRY' },
              orderBy: { id: 'asc' },
              take: 2,
              select: { price: true, currency: true },
            },
            units: {
              where: { id: { in: unitIds } },
              select: { id: true, unitName: true, multiplier: true },
            },
          },
        })
        const productsById = new Map(products.map((product) => [product.id, product]))
        const requiredStockByProduct = new Map<string, number>()
        const orderItemSnapshots: Array<{
          productId: string
          unitId: string
          stockCode: string
          productName: string
          unitName: string
          quantity: number
          unitMultiplier: number
          unitPrice: number
          subtotalAmount: number
          discountAmount: number
          totalAmount: number
          currency: string
        }> = []
        let subtotal = 0
        let discountAmount = 0
        let totalAmount = 0

        for (const item of items) {
          const product = productsById.get(item.productId)
          if (!product) {
            throw new OrderValidationError('Siparişte bulunmayan bir ürün var.')
          }

          const unit = product.units.find((candidate) => candidate.id === item.unitId)
          if (!unit) {
            throw new OrderValidationError(`${product.name} için seçilen birim geçersiz.`)
          }
          if (!Number.isSafeInteger(unit.multiplier) || unit.multiplier < 1) {
            throw new OrderValidationError(`${product.name} için birim çarpanı geçersiz.`)
          }
          if (product.prices.length !== 1 || !Number.isFinite(product.prices[0].price)) {
            throw new OrderValidationError(`${product.name} için tekil TRY fiyatı tanımlı değil.`)
          }
          if (product.prices[0].price < 0) {
            throw new OrderValidationError(`${product.name} için fiyat geçersiz.`)
          }

          const requiredStock = item.quantity * unit.multiplier
          if (!Number.isSafeInteger(requiredStock) || requiredStock < 1) {
            throw new OrderValidationError(`${product.name} için istenen miktar geçersiz.`)
          }

          const accumulatedStock =
            (requiredStockByProduct.get(product.id) ?? 0) + requiredStock
          if (!Number.isSafeInteger(accumulatedStock)) {
            throw new OrderValidationError(`${product.name} için istenen miktar çok büyük.`)
          }
          requiredStockByProduct.set(product.id, accumulatedStock)

          const lineAmounts = calculateOrderLineAmounts({
            baseUnitPrice: product.prices[0].price,
            unitMultiplier: unit.multiplier,
            quantity: item.quantity,
            discountRate: customer.discountRate,
          })
          if (
            !Number.isFinite(lineAmounts.subtotalAmount) ||
            !Number.isFinite(lineAmounts.discountAmount) ||
            !Number.isFinite(lineAmounts.totalAmount)
          ) {
            throw new OrderValidationError(`${product.name} için tutar hesaplanamadı.`)
          }
          subtotal += lineAmounts.subtotalAmount
          discountAmount += lineAmounts.discountAmount
          totalAmount += lineAmounts.totalAmount
          orderItemSnapshots.push({
            productId: product.id,
            unitId: unit.id,
            stockCode: product.stockCode,
            productName: product.name,
            unitName: unit.unitName,
            quantity: item.quantity,
            unitMultiplier: unit.multiplier,
            ...lineAmounts,
            currency: product.prices[0].currency,
          })
        }

        subtotal = roundCurrency(subtotal)
        discountAmount = roundCurrency(discountAmount)
        totalAmount = roundCurrency(totalAmount)
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
          throw new OrderValidationError('Sipariş toplamı geçersiz.')
        }
        if (roundCurrency(subtotal - discountAmount) !== totalAmount) {
          throw new OrderValidationError('Sipariş iskonto toplamı hesaplanamadı.')
        }

        if (data.paymentMethod === 'OPEN_ACCOUNT') {
          const newBalance = roundCurrency(customer.balance + totalAmount)
          if (
            !Number.isFinite(customer.balance) ||
            !Number.isFinite(customer.riskLimit) ||
            !Number.isFinite(newBalance) ||
            newBalance > customer.riskLimit
          ) {
            throw new OrderValidationError('Cari hesap risk limitiniz yetersiz.')
          }
        }

        for (const [productId, requiredStock] of requiredStockByProduct) {
          const stockUpdate = await transaction.product.updateMany({
            where: {
              id: productId,
              stockQuantity: { gte: requiredStock },
            },
            data: { stockQuantity: { decrement: requiredStock } },
          })

          if (stockUpdate.count !== 1) {
            const productName = productsById.get(productId)?.name ?? 'Ürün'
            throw new OrderValidationError(`${productName} için yeterli stok yok.`)
          }
        }

        if (data.paymentMethod === 'OPEN_ACCOUNT') {
          await transaction.customer.update({
            where: { id: customerId },
            data: { balance: { increment: totalAmount } },
          })
        }

        const status =
          data.paymentMethod === 'CREDIT_CARD'
            ? 'PENDING_PAYMENT'
            : data.paymentMethod === 'OPEN_ACCOUNT'
              ? 'APPROVED'
              : 'PENDING_TRANSFER'
        const order = await transaction.order.create({
          data: {
            customerId,
            idempotencyKey,
            status,
            paymentMethod: data.paymentMethod,
            salesRepId,
            subtotalAmount: subtotal,
            discountRate: customer.discountRate,
            discountAmount,
            totalAmount,
            currency: 'TRY',
            ...(shippingSnapshot ?? {}),
            items: { create: orderItemSnapshots },
          },
          select: { id: true },
        })

        return {
          success: true as const,
          orderId: order.id,
          idempotentReplay: false as const,
        }
      },
      { isolationLevel: 'Serializable' }
      )

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await executeTransaction()
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')
        ) {
          const existingOrder = await returnExistingOrder()
          if (existingOrder) return existingOrder

          if (error.code === 'P2034' && attempt < 2) continue
        }

        throw error
      }
    }

    throw new OrderValidationError('Sipariş işlemi tamamlanamadı. Lütfen tekrar deneyin.')
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }

    console.error('Error creating order:', error)
    return { success: false as const, error: 'Sipariş oluşturulamadı.' }
  }
}

export async function cancelOwnUnpaidOrder(orderId: string) {
  try {
    if (typeof orderId !== 'string' || !orderId.trim() || orderId.length > 128) {
      throw new OrderValidationError('Sipariş kimliği geçersiz.')
    }

    const session = await requireVerifiedSession()
    if (session.role !== 'CUSTOMER') {
      throw new AuthorizationError('Bu işlem için yetkiniz yok.', 403)
    }
    if (!(await hasOrderIntegritySchema())) {
      throw new OrderValidationError(
        'Sipariş altyapısı için veritabanı geçişi henüz tamamlanmadı.'
      )
    }

    const outcome = await prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findUnique({
          where: { id: orderId.trim() },
          select: {
            id: true,
            customerId: true,
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                unitMultiplier: true,
              },
            },
          },
        })

        if (!order || order.customerId !== session.userId) {
          throw new OrderValidationError('Sipariş bulunamadı.')
        }

        const status = parseOrderStatus(order.status)
        if (!status) {
          throw new OrderValidationError('Siparişin mevcut durumu tanınmıyor.')
        }
        if (status === 'CANCELLED') {
          return { alreadyCancelled: true as const }
        }
        if (!canCustomerCancelOrder(status)) {
          throw new OrderValidationError(
            'Yalnız ödeme veya havale bekleyen, işleme alınmamış siparişler iptal edilebilir.'
          )
        }
        if (order.items.length === 0) {
          throw new OrderValidationError(
            'Kalem snapshot’ı olmayan eski sipariş otomatik iptal edilemez.'
          )
        }

        // Claim the state first. A concurrent click can no longer restore stock
        // twice; any later failure rolls the whole serializable transaction back.
        const updated = await transaction.order.updateMany({
          where: {
            id: order.id,
            customerId: session.userId,
            status: order.status,
          },
          data: { status: 'CANCELLED' },
        })
        if (updated.count !== 1) {
          throw new OrderValidationError(
            'Sipariş bu sırada değişti. Sayfayı yenileyip tekrar deneyin.'
          )
        }

        for (const item of order.items) {
          if (!item.productId) continue
          const restoreQuantity = item.quantity * item.unitMultiplier
          if (!Number.isSafeInteger(restoreQuantity) || restoreQuantity < 1) {
            throw new OrderValidationError(
              'Sipariş stok miktarı güvenli biçimde geri alınamadı.'
            )
          }
          await transaction.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: restoreQuantity } },
          })
        }

        return { alreadyCancelled: false as const }
      },
      { isolationLevel: 'Serializable' }
    )

    revalidatePath('/siparis-takip')
    revalidatePath('/admin/siparisler')
    return { success: true as const, ...outcome }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }

    console.error('Error cancelling unpaid order:', error)
    return { success: false as const, error: 'Sipariş iptal edilemedi.' }
  }
}

export async function getOrdersByUser(userId: string) {
  const customerId = validateCustomerId(userId)
  await requireCustomerAccess(customerId)

  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserBalance(userId: string) {
  const customerId = validateCustomerId(userId)
  await requireCustomerAccess(customerId)

  return prisma.customer.findUnique({
    where: { id: customerId },
    select: { balance: true, companyCode: true, name: true },
  })
}

export async function getCustomerAccount(userId: string) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    const selectBase = {
      id: true,
      name: true,
      email: true,
      companyCode: true,
      balance: true,
      discountRate: true,
      riskLimit: true,
      createdAt: true,
    } as const

    const withStatus = (await hasCustomerApprovalSchema())
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { ...selectBase, status: true },
        })
      : null

    const customer =
      withStatus ??
      (await prisma.customer.findUnique({
        where: { id: customerId },
        select: selectBase,
      }))

    if (!customer) {
      return { success: false as const, error: 'Müşteri bulunamadı.' }
    }

    const phoneRecord = (await hasCustomerPhoneSchema())
      ? await prisma.customer.findUnique({
          where: { id: customerId },
          select: { phone: true },
        })
      : null

    const recentOrders = (await hasOrderIntegritySchema())
      ? await prisma.order.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
            paymentMethod: true,
          },
        })
      : []

    const status =
      'status' in customer && typeof customer.status === 'string'
        ? customer.status
        : 'ACTIVE'

    return {
      success: true as const,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: phoneRecord?.phone ?? null,
        companyCode: customer.companyCode,
        balance: customer.balance,
        discountRate: customer.discountRate,
        riskLimit: customer.riskLimit,
        createdAt: customer.createdAt,
        status,
      },
      recentOrders,
    }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error loading customer account:', error)
    return { success: false as const, error: 'Hesap bilgileri yüklenemedi.' }
  }
}

export async function updateCustomerProfile(
  userId: string,
  data: { name: string }
) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    const name = typeof data?.name === 'string' ? data.name.trim() : ''
    if (name.length < 2 || name.length > 120) {
      return {
        success: false as const,
        error: 'Ad veya firma adı 2-120 karakter olmalıdır.',
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { name },
      select: { id: true, name: true, email: true },
    })

    return { success: true as const, customer }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error updating customer profile:', error)
    return { success: false as const, error: 'Profil güncellenemedi.' }
  }
}

export async function changeCustomerPassword(
  userId: string,
  data: { currentPassword: string; newPassword: string }
) {
  try {
    const customerId = validateCustomerId(userId)
    await requireCustomerAccess(customerId)

    const currentPassword =
      typeof data?.currentPassword === 'string' ? data.currentPassword : ''
    const newPassword =
      typeof data?.newPassword === 'string' ? data.newPassword : ''

    if (newPassword.length < 8 || newPassword.length > 128) {
      return {
        success: false as const,
        error: 'Yeni şifre 8-128 karakter olmalıdır.',
      }
    }
    if (currentPassword === newPassword) {
      return {
        success: false as const,
        error: 'Yeni şifre mevcut şifreden farklı olmalıdır.',
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { password: true },
    })
    if (!customer) {
      return { success: false as const, error: 'Müşteri bulunamadı.' }
    }

    if (!(await verifyPassword(currentPassword, customer.password))) {
      return { success: false as const, error: 'Mevcut şifre hatalı.' }
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { password: await hashPassword(newPassword) },
    })

    try {
      await deleteSession()
    } catch {
      // The password-derived credential version already invalidates the old
      // cookie. Cookie deletion here is only immediate client cleanup.
    }

    return { success: true as const }
  } catch (error) {
    if (error instanceof OrderValidationError || error instanceof AuthorizationError) {
      return { success: false as const, error: error.message }
    }
    console.error('Error changing customer password:', error)
    return { success: false as const, error: 'Şifre değiştirilemedi.' }
  }
}
