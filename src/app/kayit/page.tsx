'use client';

import { useState } from 'react';
import { UserPlus, ShoppingCart } from 'lucide-react';
import styles from '../giris/page.module.css';
import Link from 'next/link';
import {
  DEMO_PHONE_VERIFICATION_CODE,
  formatTurkeyPhoneDisplay,
  isDemoPhoneVerificationEnabled,
  normalizeTurkeyPhone,
} from '@/lib/phone';

export default function RegisterPage() {
  const demoPhoneVerificationEnabled = isDemoPhoneVerificationEnabled();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Demo: valid mobile number auto-fills the fixed OTP. No SMS is sent.
    if (demoPhoneVerificationEnabled && normalizeTurkeyPhone(value)) {
      setVerificationCode(DEMO_PHONE_VERIFICATION_CODE);
    }
  };

  const handlePhoneBlur = () => {
    const normalized = normalizeTurkeyPhone(phone);
    if (normalized) {
      setPhone(formatTurkeyPhoneDisplay(normalized));
      if (demoPhoneVerificationEnabled) {
        setVerificationCode(DEMO_PHONE_VERIFICATION_CODE);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          verificationCode,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.pendingApproval) {
        setSuccessMessage(
          result.message ||
            'Başvurunuz alındı. Yönetici onayından sonra giriş yapabilirsiniz.'
        );
        setPassword('');
        setVerificationCode('');
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
            <label htmlFor="phone" className={styles.label}>Cep Telefonu</label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              placeholder="05XX XXX XX XX"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              required
              inputMode="tel"
              autoComplete="tel"
            />
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {demoPhoneVerificationEnabled
                ? 'Demo: Geçerli numara girilince doğrulama kodu otomatik dolar. SMS gönderilmez.'
                : 'SMS doğrulama sağlayıcısı yapılandırılana kadar yeni kayıt kapalıdır.'}
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="verificationCode" className={styles.label}>
              Telefon doğrulama kodu
            </label>
            <input
              id="verificationCode"
              type="text"
              className={styles.input}
              placeholder={demoPhoneVerificationEnabled ? '123456' : 'SMS kodu'}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              disabled={!demoPhoneVerificationEnabled}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />
            {demoPhoneVerificationEnabled && (
              <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Demo kod: <strong>{DEMO_PHONE_VERIFICATION_CODE}</strong>
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Şifre</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="En az 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !demoPhoneVerificationEnabled}
          >
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
