'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

export default function AuthSessionSync() {
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    const controller = new AbortController()

    async function syncSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await response.json()

        if (response.ok && result.success && result.user) {
          login(result.user)
          return
        }

        if (response.status === 401 || response.status === 403) {
          logout()
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // A transient network/server error must not look like a successful logout.
      }
    }

    void syncSession()
    return () => controller.abort()
  }, [login, logout])

  return null
}
