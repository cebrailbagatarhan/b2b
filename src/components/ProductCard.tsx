'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Image as ImageIcon, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
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

  // Clamp during render instead of syncing state in an effect: when the
  // selected unit changes, the available stock (and thus the valid range)
  // changes with it.
  const quantity = Math.max(1, Math.min(rawQuantity, availableQuantity || 1));

  const handleDecrease = () => setQuantity(Math.max(1, quantity - 1));
  const handleIncrease = () =>
    setQuantity(Math.min(availableQuantity || 1, quantity + 1));

  // B2B Feature: Dynamic Pricing & Discount
  const discountRate = user?.discountRate || 0;
  const originalPrice = priceObj?.price || 0;
  const finalPrice = originalPrice * (1 - discountRate);

  const displayOriginalPrice = !isLoggedIn ? '' :
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: priceObj?.currency || 'TRY' }).format(originalPrice);

  const displayFinalPrice = !isLoggedIn
    ? 'Giriş yapınız'
    : priceObj
      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: priceObj.currency }).format(finalPrice)
      : 'Fiyat Yok';

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
      unitPrice: finalPrice, // İskontolu fiyat sepete atılır
      currency: priceObj.currency,
      imageUrl: product.imageUrl,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1200);
  };

  const handleWaitlist = async () => {
    if (!user) {
      alert("Haber ver listesine eklenmek için giriş yapmalısınız.");
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
        alert("Haber ver listesine eklendiniz!");
      } else {
        alert("Hata: " + data.error);
      }
    } catch {
      alert("Bir hata oluştu.");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageArea}>
        <Link
          href={`/urun/${product.id}`}
          className={styles.imageLink}
          aria-label={`${product.name} ürün detayını görüntüle`}
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
        
        {/* Stock Status Indicator */}
        {inStock ? (
          <div className={styles.stockBadge} title="Stokta Var">
            <Check size={14} />
            Stokta
          </div>
        ) : (
          <div className={styles.stockBadge} style={{ background: 'var(--danger)' }} title="Stokta Yok">
            Tükendi
          </div>
        )}

        <button 
          type="button"
          className={styles.heartBtn} 
          onClick={() => setIsFavorite(!isFavorite)}
          style={{ color: isFavorite ? 'var(--danger)' : '' }}
          aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
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
          <span className={styles.priceLabel}>Bayi Fiyatı (KDV Hariç)</span>
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
            aria-label={`${product.name} için satış birimi`}
          >
            {product.units.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName} {unit.multiplier > 1 ? `(${unit.multiplier} Adet)` : ''}
              </option>
            ))}
          </select>

          <div className={styles.quantityControl}>
            <button type="button" className={styles.qtyBtn} onClick={handleDecrease} disabled={quantity <= 1} aria-label="Adedi azalt"><Minus size={16} /></button>
            <input 
              type="number" 
              className={styles.qtyInput} 
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(availableQuantity || 1, parseInt(e.target.value) || 1)))}
              min={1}
              max={availableQuantity || 1}
              aria-label="Sipariş adedi"
            />
            <button type="button" className={styles.qtyBtn} onClick={handleIncrease} disabled={!canOrderSelectedUnit || quantity >= availableQuantity} aria-label="Adedi artır"><Plus size={16} /></button>
          </div>

          {inStock && canOrderSelectedUnit ? (
            <button 
              type="button"
              className={`${styles.addToCartBtn} ${addedFeedback ? styles.addedFeedback : ''}`}
              onClick={handleAddToCart}
            >
              {addedFeedback ? (
                <><Check size={18} /> Eklendi!</>
              ) : (
                <><ShoppingCart size={18} /> Sepete Ekle</>
              )}
            </button>
          ) : !inStock ? (
            <button 
              type="button"
              className={styles.addToCartBtn}
              style={{ background: 'var(--warning)', color: '#000' }}
              onClick={handleWaitlist}
            >
              Gelince Haber Ver
            </button>
          ) : (
            <button
              type="button"
              className={styles.addToCartBtn}
              disabled
              title="Seçilen satış birimi için yeterli stok yok"
            >
              Bu Birim İçin Stok Yetersiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
