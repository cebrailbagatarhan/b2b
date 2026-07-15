'use client';

import { useState } from 'react';
import { UserPlus, ShoppingCart } from 'lucide-react';
import styles from '../giris/page.module.css';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.pendingApproval) {
        setSuccessMessage(
          result.message ||
            'Başvurunuz alındı. Yönetici onayından sonra giriş yapabilirsiniz.'
        );
        setPassword('');
      } else {
        setError(result.error || 'Kayıt başarısız.');
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <ShoppingCart size={28} />
          </div>
          <h1 className={styles.loginTitle}>Yeni Kayıt</h1>
          <p className={styles.loginSubtitle}>TopTan Market&apos;e müşteri olarak katılın</p>
        </div>

        {error && (
          <div className={styles.errorMsg} role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className={styles.successMsg} role="status" aria-live="polite">
            <strong>Başvurunuz alındı.</strong>
            <br />
            {successMessage}
            <br />
            Onay verilene kadar oturum açılmaz ve cari limit tanımlanmaz.
          </div>
        )}

        {!successMessage && <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Ad Soyad / Firma Adı</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              placeholder="Adınız veya Firmanız"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>E-posta Adresi</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="ornek@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Şifre</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <UserPlus size={20} />
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Zaten hesabınız var mı? <Link href="/giris" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Giriş Yapın</Link>
        </div>
      </div>
    </div>
  );
}
