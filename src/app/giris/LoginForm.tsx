'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, ShoppingCart } from 'lucide-react'
import { getAuthenticatedHomePath } from '@/lib/auth-navigation'
import { useAuthStore } from '@/lib/store'
import styles from './page.module.css'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok && result.success && result.user) {
        login(result.user)
        router.replace(getAuthenticatedHomePath(result.user))
        router.refresh()
        return
      }

      setError(result.error || 'Giriş başarısız.')
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
          <h1 className={styles.loginTitle}>Bayi Girişi</h1>
          <p className={styles.loginSubtitle}>
            TopTan Market hesabınıza giriş yapın
          </p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

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

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Şifre
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            <LogIn size={20} />
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
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
          Henüz hesabınız yok mu?{' '}
          <Link
            href="/kayit"
            style={{ color: 'var(--accent-primary)', fontWeight: 500 }}
          >
            Kayıt Olun
          </Link>
        </div>
      </div>
    </div>
  )
}
