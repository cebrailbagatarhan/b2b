'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Image as ImageIcon, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { formatMoney } from '@/lib/i18n';
import { useLocale, useT } from '@/lib/use-t';
import styles from './ProductCard.module.css';

type ProductUnit = {
  id: string;
  unitName: string;
  multiplier: number;
};

type ProductPrice = {
  id: string;
  price: number;
  currency: string;
};

type Product = {
  id: string;
  stockCode: string;
  name: string;
  imageUrl?: string | null;
  stockQuantity: number;
  units: ProductUnit[];
  prices: ProductPrice[];
};

export default function ProductCard({ product }: { product: Product }) {
  const t = useT();
  const locale = useLocale();
  const p = t.product;
  const [selectedUnitId, setSelectedUnitId] = useState<string>(product.units[0]?.id || '');
  const [rawQuantity, setQuantity] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const addToCart = useCartStore((s) => s.addToCart);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;

  const priceObj = product.prices[0];
  const unitObj = product.units.find(u => u.id === selectedUnitId) || product.units[0];

  const availableQuantity = unitObj && Number.isInteger(unitObj.multiplier) && unitObj.multiplier > 0
    ? Math.floor(Math.max(0, product.stockQuantity) / unitObj.multiplier)
    : 0;

  const quantity = Math.max(1, Math.min(rawQuantity, availableQuantity || 1));

  const handleDecrease = () => setQuantity(Math.max(1, quantity - 1));
  const handleIncrease = () =>
    setQuantity(Math.min(availableQuantity || 1, quantity + 1));

  const discountRate = user?.discountRate || 0;
  const originalPrice = priceObj?.price || 0;
  const finalPrice = originalPrice * (1 - discountRate);

  const displayOriginalPrice = !isLoggedIn ? '' :
    formatMoney(originalPrice, priceObj?.currency || 'TRY', locale);

  const displayFinalPrice = !isLoggedIn
    ? p.loginForPrice
    : priceObj
      ? formatMoney(finalPrice, priceObj.currency, locale)
      : p.noPrice;

  const inStock = product.stockQuantity > 0;
  const canOrderSelectedUnit = availableQuantity > 0;

  const handleAddToCart = () => {
    if (
      !priceObj ||
      !unitObj ||
      !canOrderSelectedUnit ||
      quantity > availableQuantity
    ) return;
    addToCart({
      productId: product.id,
      productName: product.name,
      stockCode: product.stockCode,
      unitId: unitObj.id,
      unitName: unitObj.unitName,
      multiplier: unitObj.multiplier,
      quantity,
      unitPrice: finalPrice,
      currency: priceObj.currency,
      imageUrl: product.imageUrl,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1200);
  };

  const handleWaitlist = async () => {
    if (!user) {
      alert(p.waitlistNeedLogin);
      return;
    }

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(p.waitlistOk);
      } else {
        alert(p.errorPrefix + data.error);
      }
    } catch {
      alert(p.waitlistError);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageArea}>
        <Link
          href={`/urun/${product.id}`}
          className={styles.imageLink}
          aria-label={`${product.name} ${p.viewProduct}`}
        >
          <ImageIcon size={48} className={styles.placeholderImage} aria-hidden="true" />
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              style={{ objectFit: 'contain', padding: '1rem' }}
              unoptimized
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
        </Link>

        {inStock ? (
          <div className={styles.stockBadge} title={p.inStockTitle}>
            <Check size={14} />
            {p.inStock}
          </div>
        ) : (
          <div className={styles.stockBadge} style={{ background: 'var(--danger)' }} title={p.outOfStockTitle}>
            {p.outOfStock}
          </div>
        )}

        <button
          type="button"
          className={styles.heartBtn}
          onClick={() => setIsFavorite(!isFavorite)}
          style={{ color: isFavorite ? 'var(--danger)' : '' }}
          aria-label={isFavorite ? p.removeFavorite : p.addFavorite}
          aria-pressed={isFavorite}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.content}>
        <span className={styles.stockCode}>{product.stockCode}</span>
        <h3 className={styles.title} title={product.name}>
          <Link href={`/urun/${product.id}`} className={styles.titleLink}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.priceArea}>
          <span className={styles.priceLabel}>{p.dealerPrice}</span>
          {isLoggedIn && discountRate > 0 && (
            <span style={{ textDecoration: 'line-through', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              {displayOriginalPrice}
            </span>
          )}
          <span className={`${styles.price} ${!isLoggedIn ? styles.priceHidden : ''}`}>
            {displayFinalPrice}
          </span>
        </div>

        <div className={styles.actionArea}>
          <select
            className={styles.unitSelect}
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            aria-label={`${product.name} ${p.unitLabel}`}
          >
            {product.units.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName} {unit.multiplier > 1 ? `(${unit.multiplier} ${p.pieces})` : ''}
              </option>
            ))}
          </select>

          <div className={styles.quantityControl}>
            <button type="button" className={styles.qtyBtn} onClick={handleDecrease} disabled={quantity <= 1} aria-label={p.qtyDecrease}><Minus size={16} /></button>
            <input
              type="number"
              className={styles.qtyInput}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(availableQuantity || 1, parseInt(e.target.value) || 1)))}
              min={1}
              max={availableQuantity || 1}
              aria-label={p.qtyLabel}
            />
            <button type="button" className={styles.qtyBtn} onClick={handleIncrease} disabled={!canOrderSelectedUnit || quantity >= availableQuantity} aria-label={p.qtyIncrease}><Plus size={16} /></button>
          </div>

          {inStock && canOrderSelectedUnit ? (
            <button
              type="button"
              className={`${styles.addToCartBtn} ${addedFeedback ? styles.addedFeedback : ''}`}
              onClick={handleAddToCart}
            >
              {addedFeedback ? (
                <><Check size={18} /> {p.added}</>
              ) : (
                <><ShoppingCart size={18} /> {p.addToCart}</>
              )}
            </button>
          ) : !inStock ? (
            <button
              type="button"
              className={styles.addToCartBtn}
              style={{ background: 'var(--warning)', color: '#000' }}
              onClick={handleWaitlist}
            >
              {p.notifyMe}
            </button>
          ) : (
            <button
              type="button"
              className={styles.addToCartBtn}
              disabled
              title={p.insufficientStockTitle}
            >
              {p.insufficientStock}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
