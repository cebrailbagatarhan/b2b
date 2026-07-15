'use client'

import { usePathname } from 'next/navigation'
import Footer from '@/components/Footer'
import Header from '@/components/Header'

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminRoute) return children

  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 150px)' }}>{children}</main>
      <Footer />
    </>
  )
}
