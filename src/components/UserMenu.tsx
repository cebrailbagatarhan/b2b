'use client';

import { useAuthStore } from '@/lib/store';
import { User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthenticatedHomePath } from '@/lib/auth-navigation';
import styles from './Header.module.css';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
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
      window.alert('Çıkış yapılamadı. Oturumunuz hâlâ açık; lütfen tekrar deneyin.');
    }
  };

  if (!user) {
    return (
      <Link href="/giris" className={styles.actionButton}>
        <div className={styles.iconWrapper}>
          <User size={24} />
        </div>
        <span>Giriş Yap</span>
      </Link>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      {user.role === 'ADMIN' && (
        <Link href={adminPanelHref} className={styles.actionButton} title="Yönetim Paneli" style={{ color: 'var(--accent-primary)' }}>
          <div className={styles.iconWrapper}>
            <User size={24} />
          </div>
          <span>Panel</span>
        </Link>
      )}

      <div className={styles.actionButton} style={{ cursor: 'default' }}>
        <div className={styles.iconWrapper}>
          <User size={24} />
        </div>
        <span style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
      </div>
      
      <button onClick={handleLogout} className={styles.actionButton} title="Çıkış Yap">
        <div className={styles.iconWrapper}>
          <LogOut size={24} />
        </div>
        <span>Çıkış</span>
      </button>
    </div>
  );
}
