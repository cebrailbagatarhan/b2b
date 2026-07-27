'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getRestoredLoginDestination,
  shouldSyncRestoredPage,
} from '@/lib/auth-session-restore'
import { useAuthStore } from '@/lib/store'

export default function AuthSessionSync() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    const controller = new AbortController()

    async function syncSession(redirectRestoredLogin = false) {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await response.json()

        if (response.ok && result.success && result.user) {
          login(result.user)
          const destination = getRestoredLoginDestination(
            redirectRestoredLogin,
            window.location.pathname,
            result.user
          )
          if (destination) router.replace(destination)
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

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!shouldSyncRestoredPage(event.persisted)) return
      void syncSession(true)
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      controller.abort()
    }
  }, [login, logout, router])

  return null
}
