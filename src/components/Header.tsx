'use client';

import Link from 'next/link';
import { Search, Heart, Phone, Mail } from 'lucide-react';
import CartBadge from './CartBadge';
import UserMenu from './UserMenu';
import { useAuthStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuthStore();
  const isMounted = useHydrated();

  return (
    <header className={styles.header}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className={styles.topBarLinks}>
              <a href="tel:+908501234567" className={styles.topBarLink} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Phone size={14} /> 0850 123 45 67
              </a>
              <a href="mailto:destek@toptanmarket.com" className={styles.topBarLink} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Mail size={14} /> destek@toptanmarket.com
              </a>
            </div>
            <div className={styles.topBarLinks}>
              <Link href="/hakkimizda" className={styles.topBarLink}>Hakkımızda</Link>
              <Link href="/iletisim" className={styles.topBarLink}>İletişim</Link>
              <Link href="/banka-hesaplari" className={styles.topBarLink}>Banka Hesapları</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container">
        <div className={styles.mainHeader}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            TopTan Market
          </Link>

          <form className={styles.searchForm} action="/arama" method="GET">
            <input 
              type="text"
              name="q"
              placeholder="Stok Kodu veya Ürün Adı ile arayın..." 
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              <Search size={20} />
            </button>
          </form>

          <div className={styles.actions}>
            {isMounted && (
              <>
                <UserMenu />
                
                {user?.role !== 'ADMIN' && (
                  <button className={styles.actionButton}>
                    <div className={styles.iconWrapper}>
                      <Heart size={24} />
                      <span className={styles.badge}>0</span>
                    </div>
                    <span>Favoriler</span>
                  </button>
                )}

                <CartBadge />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
        <div className="container">
          <nav className={styles.nav}>
            <Link href="/kategori/hirdavat" className={styles.navLink}>Hırdavat</Link>
            <Link href="/kategori/oyuncak" className={styles.navLink}>Oyuncak</Link>
            <Link href="/kategori/kirtasiye" className={styles.navLink}>Kırtasiye</Link>
            <Link href="/kategori/zuccaciye" className={styles.navLink}>Züccaciye</Link>
            <Link href="/kategori/kozmetik" className={styles.navLink}>Kozmetik</Link>
            <Link href="/kategori/tekstil" className={styles.navLink}>Tekstil</Link>
            <Link href="/kampanyalar" className={styles.navLink} style={{ color: 'var(--danger)', fontWeight: 600 }}>🔥 Kampanyalar</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
