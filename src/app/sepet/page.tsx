'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Image as ImageIcon, Minus, Plus, Trash2, CreditCard } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import styles from './page.module.css';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalItems = useCartStore((s) => s.totalItems());
  const totalAmount = useCartStore((s) => s.totalAmount());

  const isMounted = useHydrated();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  if (!isMounted) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Sepet yükleniyor...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className={styles.emptyCart}>
          <ShoppingCart size={64} className={styles.emptyCartIcon} />
          <h2 className={styles.emptyCartTitle}>Sepetiniz Boş</h2>
          <p>Henüz sepetinize ürün eklemediniz.</p>
          <Link href="/" className={styles.emptyCartLink}>
            Alışverişe Başla
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.cartPage}`}>
      <h1 className={styles.cartTitle}>Sepetim ({totalItems} ürün)</h1>

      <div className={styles.cartLayout}>
        {/* Cart Items */}
        <div className={styles.cartItems}>
          {items.map((item) => (
            <div key={`${item.productId}-${item.unitId}`} className={styles.cartItem}>
              <div className={styles.itemImage} style={{ position: 'relative', overflow: 'hidden' }}>
                <ImageIcon size={32} />
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="80px"
                    style={{ objectFit: 'contain', padding: '0.25rem' }}
                    unoptimized
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>

              <div className={styles.itemInfo}>
                <div className={styles.itemName} title={item.productName}>{item.productName}</div>
                <div className={styles.itemCode}>{item.stockCode}</div>
                <div className={styles.itemUnit}>
                  {item.unitName} {item.multiplier > 1 ? `(${item.multiplier} Adet)` : ''}
                </div>
              </div>

              <div className={styles.itemQty}>
                <button
                  className={styles.itemQtyBtn}
                  onClick={() => updateQuantity(item.productId, item.unitId, item.quantity - 1)}
                >
                  <Minus size={14} />
                </button>
                <span className={styles.itemQtyValue}>{item.quantity}</span>
                <button
                  className={styles.itemQtyBtn}
                  onClick={() => updateQuantity(item.productId, item.unitId, item.quantity + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className={styles.itemPrice}>
                {formatPrice(item.unitPrice * item.quantity * item.multiplier)}
              </div>

              <button
                className={styles.removeBtn}
                onClick={() => removeFromCart(item.productId, item.unitId)}
                title="Kaldır"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Sipariş Özeti</h3>

          <div className={styles.summaryRow}>
            <span>Ürün Sayısı</span>
            <span>{totalItems}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Ara Toplam</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Kargo</span>
            <span style={{ color: 'var(--success)', fontWeight: 500 }}>Ücretsiz</span>
          </div>

          <div className={styles.summaryTotal}>
            <span>Toplam</span>
            <span style={{ color: 'var(--accent-primary)' }}>{formatPrice(totalAmount)}</span>
          </div>

          <Link href="/sepet/odeme" className={styles.checkoutBtn} style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
            <CreditCard size={20} />
            Siparişi Tamamla
          </Link>

          <button className={styles.clearBtn} onClick={clearCart}>
            Sepeti Temizle
          </button>
        </div>
      </div>
    </div>
  );
}
