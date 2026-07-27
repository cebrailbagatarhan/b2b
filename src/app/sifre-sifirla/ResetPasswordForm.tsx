'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, ShoppingCart } from 'lucide-react'
import styles from '@/app/giris/page.module.css'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Sıfırlama bağlantısı eksik veya geçersiz.')
      return
    }

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Şifre güncellenemedi.')
        return
      }

      setMessage(result.message || 'Şifre güncellendi.')
      setTimeout(() => {
        router.replace('/giris')
        router.refresh()
      }, 1200)
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
          <h1 className={styles.loginTitle}>Yeni Şifre</h1>
          <p className={styles.loginSubtitle}>
            Hesabınız için yeni bir şifre belirleyin
          </p>
        </div>

        {!token && (
          <div className={styles.errorMsg}>
            Geçersiz bağlantı. Lütfen{' '}
            <Link href="/sifremi-unuttum" style={{ fontWeight: 600 }}>
              yeni bir talep
            </Link>{' '}
            oluşturun.
          </div>
        )}

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
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Yeni şifre
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={!token}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirm" className={styles.label}>
              Yeni şifre (tekrar)
            </label>
            <input
              id="confirm"
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={!token}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !token}
          >
            <KeyRound size={20} />
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
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
