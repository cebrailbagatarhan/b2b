'use client';

import { useAuthStore } from '@/lib/store';
import { User, LogOut, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthenticatedHomePath } from '@/lib/auth-navigation';
import { getDictionary } from '@/lib/i18n';
import { useUiPreferences } from '@/lib/ui-preferences';
import styles from './Header.module.css';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const locale = useUiPreferences((s) => s.locale);
  const t = getDictionary(locale);
  const adminPanelHref = user?.role === 'ADMIN'
    ? getAuthenticatedHomePath(user)
    : '/giris';

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout request failed');

      logout();
      router.replace('/');
      router.refresh();
    } catch {
      window.alert(
        locale === 'en'
          ? 'Could not sign out. Your session may still be active; please try again.'
          : 'Çıkış yapılamadı. Oturumunuz hâlâ açık; lütfen tekrar deneyin.'
      );
    }
  };

  if (!user) {
    return (
      <Link href="/giris" className={styles.actionButton}>
        <div className={styles.iconWrapper}>
          <User size={24} />
        </div>
        <span>{t.login}</span>
      </Link>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {user.role === 'ADMIN' ? (
        <Link href={adminPanelHref} className={styles.actionButton} title={t.panel} style={{ color: 'var(--accent-primary)' }}>
          <div className={styles.iconWrapper}>
            <User size={24} />
          </div>
          <span>{t.panel}</span>
        </Link>
      ) : (
        <>
          <Link href="/hesabim" className={styles.actionButton} title={t.footer.myAccount}>
            <div className={styles.iconWrapper}>
              <User size={24} />
            </div>
            <span style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
          </Link>
          <Link href="/siparis-takip" className={styles.actionButton} title={t.orders}>
            <div className={styles.iconWrapper}>
              <Package size={24} />
            </div>
            <span>{t.orders}</span>
          </Link>
        </>
      )}

      <button type="button" onClick={handleLogout} className={styles.actionButton} title={t.logout}>
        <div className={styles.iconWrapper}>
          <LogOut size={24} />
        </div>
        <span>{t.logout}</span>
      </button>
    </div>
  );
}
