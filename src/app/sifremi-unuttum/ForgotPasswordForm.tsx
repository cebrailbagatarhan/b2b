'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound, ShoppingCart } from 'lucide-react'
import styles from '@/app/giris/page.module.css'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setResetUrl('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Talep gönderilemedi.')
        return
      }

      setMessage(result.message || 'E-posta gönderildi.')
      if (typeof result.resetUrl === 'string') {
        setResetUrl(result.resetUrl)
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <ShoppingCart size={28} />
          </div>
          <h1 className={styles.loginTitle}>Şifremi Unuttum</h1>
          <p className={styles.loginSubtitle}>
            E-posta adresinize sıfırlama bağlantısı gönderilir
          </p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {message && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-light)',
              color: 'var(--accent-pressed)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {message}
            {resetUrl && (
              <p style={{ marginTop: '0.75rem' }}>
                Geliştirme bağlantısı:{' '}
                <Link
                  href={resetUrl}
                  style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  Şifreyi sıfırla
                </Link>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              E-posta Adresi
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="ornek@firma.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <KeyRound size={20} />
            {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Link
            href="/giris"
            style={{ color: 'var(--accent-primary)', fontWeight: 500 }}
          >
            Girişe dön
          </Link>
        </div>
      </div>
    </div>
  )
}
