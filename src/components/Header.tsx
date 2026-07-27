'use client';

import Link from 'next/link';
import { Search, Heart, Phone, Mail } from 'lucide-react';
import CartBadge from './CartBadge';
import UserMenu from './UserMenu';
import ThemeLangControls from './ThemeLangControls';
import { useAuthStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import { getDictionary } from '@/lib/i18n';
import { useUiPreferences } from '@/lib/ui-preferences';
import styles from './Header.module.css';

export default function Header() {
  const { user } = useAuthStore();
  const isMounted = useHydrated();
  const locale = useUiPreferences((s) => s.locale);
  const t = getDictionary(locale);

  return (
    <header className={styles.header}>
      {/* Top bar — stays with sticky header */}
      <div className={styles.topBar}>
        <div className="container">
          <div className={styles.topBarInner}>
            <div className={styles.topBarLinks}>
              <a href="tel:+908501234567" className={styles.topBarLink}>
                <Phone size={14} /> 0850 123 45 67
              </a>
              <a href="mailto:destek@toptanmarket.com" className={styles.topBarLink}>
                <Mail size={14} /> destek@toptanmarket.com
              </a>
            </div>
            <div className={styles.topBarRight}>
              <ThemeLangControls />
              <div className={`${styles.topBarLinks} ${styles.topBarNav}`}>
                <Link href="/hakkimizda" className={styles.topBarLink}>{t.about}</Link>
                <Link href="/iletisim" className={styles.topBarLink}>{t.contact}</Link>
                <Link href="/banka-hesaplari" className={styles.topBarLink}>{t.bankAccounts}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainBlock}>
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
                placeholder={t.searchPlaceholder}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchButton} aria-label={t.searchAria}>
                <Search size={20} />
              </button>
            </form>

            <div className={styles.actions}>
              {isMounted && (
                <>
                  <UserMenu />

                  {user?.role !== 'ADMIN' && (
                    <button type="button" className={styles.actionButton}>
                      <div className={styles.iconWrapper}>
                        <Heart size={24} />
                        <span className={styles.badge}>0</span>
                      </div>
                      <span>{t.favorites}</span>
                    </button>
                  )}

                  <CartBadge />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.navBlock}>
        <div className="container">
          <nav className={styles.nav} aria-label={t.categoriesNav}>
            <Link href="/kategori/hirdavat" className={styles.navLink}>{t.categories.hardware}</Link>
            <Link href="/kategori/oyuncak" className={styles.navLink}>{t.categories.toys}</Link>
            <Link href="/kategori/kirtasiye" className={styles.navLink}>{t.categories.stationery}</Link>
            <Link href="/kategori/zuccaciye" className={styles.navLink}>{t.categories.housewares}</Link>
            <Link href="/kategori/kozmetik" className={styles.navLink}>{t.categories.cosmetics}</Link>
            <Link href="/kategori/tekstil" className={styles.navLink}>{t.categories.textile}</Link>
            <Link href="/kampanyalar" className={`${styles.navLink} ${styles.navLinkHot}`}>
              {t.campaigns}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
