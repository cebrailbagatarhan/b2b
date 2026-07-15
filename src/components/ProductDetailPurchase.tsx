'use client'

import { useMemo, useState } from 'react'
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useAuthStore, useCartStore } from '@/lib/store'
import styles from './ProductDetailPurchase.module.css'

type ProductUnit = {
  id: string
  unitName: string
  multiplier: number
}

type ProductPrice = {
  id: string
  price: number
  currency: string
}

type ProductDetailPurchaseProps = {
  product: {
    id: string
    stockCode: string
    name: string
    imageUrl?: string | null
    stockQuantity: number
    units: ProductUnit[]
    prices: ProductPrice[]
  }
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

export default function ProductDetailPurchase({ product }: ProductDetailPurchaseProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(product.units[0]?.id ?? '')
  const [rawQuantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)

  const addToCart = useCartStore((state) => state.addToCart)
  const user = useAuthStore((state) => state.user)
  const selectedUnit = product.units.find((unit) => unit.id === selectedUnitId)
  const selectedPrice =
    product.prices.find((price) => price.currency === 'TRY') ?? product.prices[0]
  const discountRate = user?.discountRate ?? 0
  const safeDiscountRate =
    Number.isFinite(discountRate) && discountRate >= 0 && discountRate <= 1
      ? discountRate
      : 0
  const availableQuantity =
    selectedUnit && Number.isInteger(selectedUnit.multiplier) && selectedUnit.multiplier > 0
      ? Math.floor(Math.max(0, product.stockQuantity) / selectedUnit.multiplier)
      : 0

  const pricesForSelectedUnit = useMemo(() => {
    const multiplier = selectedUnit?.multiplier ?? 1

    return product.prices.map((price) => ({
      ...price,
      originalUnitPrice: price.price * multiplier,
      discountedUnitPrice: price.price * multiplier * (1 - safeDiscountRate),
    }))
  }, [product.prices, safeDiscountRate, selectedUnit?.multiplier])

  // Clamp during render instead of syncing state in an effect: when the
  // selected unit changes, the available stock (and thus the valid range)
  // changes with it.
  const quantity = Math.max(1, Math.min(rawQuantity, availableQuantity || 1))

  const canAddToCart = Boolean(
    selectedUnit &&
      selectedPrice &&
      Number.isFinite(selectedPrice.price) &&
      selectedPrice.price >= 0 &&
      availableQuantity > 0 &&
      quantity >= 1 &&
      quantity <= availableQuantity
  )

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedUnit || !selectedPrice) return

    addToCart({
      productId: product.id,
      productName: product.name,
      stockCode: product.stockCode,
      unitId: selectedUnit.id,
      unitName: selectedUnit.unitName,
      multiplier: selectedUnit.multiplier,
      quantity,
      unitPrice: selectedPrice.price * (1 - safeDiscountRate),
      currency: selectedPrice.currency,
      imageUrl: product.imageUrl,
    })
    setAddedFeedback(true)
    window.setTimeout(() => setAddedFeedback(false), 1200)
  }

  return (
    <section className={styles.purchase} aria-labelledby="purchase-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Bayi siparişi</p>
          <h2 id="purchase-title" className={styles.title}>Birim ve fiyat seçimi</h2>
        </div>
        <span className={product.stockQuantity > 0 ? styles.inStock : styles.outOfStock}>
          {product.stockQuantity > 0 ? 'Stokta' : 'Tükendi'}
        </span>
      </div>

      {product.units.length > 0 ? (
        <label className={styles.field}>
          <span>Satış birimi</span>
          <select
            value={selectedUnitId}
            onChange={(event) => setSelectedUnitId(event.target.value)}
          >
            {product.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName}{unit.multiplier > 1 ? ` (${unit.multiplier} adet)` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className={styles.notice}>Bu ürün için henüz satış birimi tanımlanmamış.</p>
      )}

      <div className={styles.priceList} aria-label="Ürün fiyatları">
        {pricesForSelectedUnit.length > 0 ? (
          pricesForSelectedUnit.map((price) => (
            <div key={price.id} className={styles.priceRow}>
              <span>{selectedUnit?.unitName ?? 'Birim'} fiyatı</span>
              {user ? (
                <div className={styles.priceValues}>
                  {safeDiscountRate > 0 && (
                    <del>{formatMoney(price.originalUnitPrice, price.currency)}</del>
                  )}
                  <strong>{formatMoney(price.discountedUnitPrice, price.currency)}</strong>
                </div>
              ) : (
                <strong className={styles.loginNotice}>Fiyat için giriş yapın</strong>
              )}
            </div>
          ))
        ) : (
          <p className={styles.notice}>Bu ürün için henüz fiyat tanımlanmamış.</p>
        )}
      </div>

      <div className={styles.quantitySection}>
        <div>
          <span className={styles.quantityLabel}>Sipariş miktarı</span>
          <small>Bu birimde en fazla {availableQuantity} sipariş verilebilir.</small>
        </div>
        <div className={styles.quantityControl}>
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Miktarı azalt"
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <input
            type="number"
            min={1}
            max={availableQuantity || 1}
            value={quantity}
            onChange={(event) => {
              const nextQuantity = Number.parseInt(event.target.value, 10)
              setQuantity(
                Math.max(1, Math.min(availableQuantity || 1, nextQuantity || 1))
              )
            }}
            aria-label="Sipariş miktarı"
          />
          <button
            type="button"
            onClick={() =>
              setQuantity(Math.min(availableQuantity || 1, quantity + 1))
            }
            disabled={!availableQuantity || quantity >= availableQuantity}
            aria-label="Miktarı artır"
          >
            <Plus size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.addButton} ${addedFeedback ? styles.added : ''}`}
        onClick={handleAddToCart}
        disabled={!canAddToCart}
      >
        {addedFeedback ? (
          <><Check size={19} aria-hidden="true" /> Sepete eklendi</>
        ) : (
          <><ShoppingCart size={19} aria-hidden="true" /> Sepete ekle</>
        )}
      </button>
      <p className={styles.safetyNote}>
        Nihai fiyat ve stok, sipariş oluşturulurken sunucuda yeniden doğrulanır.
      </p>
      <span className={styles.srOnly} aria-live="polite">
        {addedFeedback ? `${product.name} sepete eklendi.` : ''}
      </span>
    </section>
  )
}
