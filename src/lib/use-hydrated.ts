'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * Returns false during SSR and the first client render, true after hydration.
 * Safe replacement for the `useEffect(() => setMounted(true), [])` pattern:
 * it avoids the extra setState-in-effect render cascade while keeping the
 * server and first client render output identical.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
