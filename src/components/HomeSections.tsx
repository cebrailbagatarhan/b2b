'use client'

import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { useT } from '@/lib/use-t'

type ProductUnit = {
  id: string
  unitName: string
  multiplier: number
}

type ProductPrice = {
  id: string
  price: number
  currency: string
}

type Product = {
  id: string
  stockCode: string
  name: string
  imageUrl?: string | null
  stockQuantity: number
  units: ProductUnit[]
  prices: ProductPrice[]
}

export default function HomeSections({ products }: { products: Product[] }) {
  const t = useT()

  return (
    <>
      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t.home.featured}</h1>
          <Link
            href="/kategoriler"
            style={{
              color: 'var(--accent-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {t.home.seeAll} &rarr;
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 'var(--spacing-lg)',
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-secondary)',
              }}
            >
              {t.home.emptyProducts}{' '}
              <code>npx tsx prisma/seed.ts</code> {t.home.emptyHint}
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          marginTop: 'var(--spacing-2xl)',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        <div
          style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1rem',
          }}
        >
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{t.home.campaignTitle}</h2>
          <p style={{ maxWidth: 600, opacity: 0.9, lineHeight: 1.6 }}>
            {t.home.campaignBody}
          </p>
          <Link
            href="/kampanyalar"
            style={{
              backgroundColor: 'white',
              color: 'var(--accent-pressed)',
              padding: '0.75rem 2rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '0.95rem',
              marginTop: '0.5rem',
              cursor: 'pointer',
              border: 'none',
              display: 'inline-block',
            }}
          >
            {t.home.campaignCta}
          </Link>
        </div>
      </section>
    </>
  )
}
