'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import styles from './Header.module.css';

export default function CartBadge() {
  const { user } = useAuthStore();
  const totalItems = useCartStore((s) => s.totalItems());
  const isMounted = useHydrated();

  if (user?.role === 'ADMIN') return null;

  return (
    <Link href="/sepet" className={styles.actionButton}>
      <div className={styles.iconWrapper}>
        <ShoppingCart size={24} />
        {isMounted && <span className={styles.badge}>{totalItems}</span>}
      </div>
      <span>Sepetim</span>
    </Link>
  );
}
