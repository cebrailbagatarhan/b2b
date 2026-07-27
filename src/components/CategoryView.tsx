'use client'

import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { categoryNameToSlug } from '@/lib/category-slug'
import {
  formatProductCount,
  translateCategoryName,
} from '@/lib/i18n'
import { useLocale, useT } from '@/lib/use-t'

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

type ChildCategory = {
  id: string
  name: string
}

type CategoryViewProps = {
  categoryName: string
  categorySlug: string
  products: Product[]
  subcategories?: ChildCategory[]
  parent?: { name: string; slug: string } | null
}

export default function CategoryView({
  categoryName,
  categorySlug,
  products,
  subcategories = [],
  parent = null,
}: CategoryViewProps) {
  const t = useT()
  const locale = useLocale()
  const title = translateCategoryName(categoryName, locale)
  const parentTitle = parent ? translateCategoryName(parent.name, locale) : null

  return (
    <div
      className="container"
      style={{
        paddingTop: 'var(--spacing-xl)',
        paddingBottom: 'var(--spacing-2xl)',
      }}
    >
      <nav
        aria-label={t.breadcrumbAria}
        style={{
          marginBottom: 'var(--spacing-lg)',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Link href="/" style={{ color: 'var(--accent-primary)' }}>
          {t.homeLink}
        </Link>
        {parent && parentTitle && (
          <>
            {' / '}
            <Link
              href={`/kategori/${parent.slug}`}
              style={{ color: 'var(--accent-primary)' }}
            >
              {parentTitle}
            </Link>
          </>
        )}
        {' / '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{title}</span>
      </nav>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <div>
          {parentTitle && (
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              {parentTitle}
            </p>
          )}
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{title}</h1>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {formatProductCount(products.length, locale)}
        </span>
      </div>

      {subcategories.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            marginBottom: 'var(--spacing-xl)',
            flexWrap: 'wrap',
          }}
        >
          {subcategories.map((child) => (
            <Link
              key={child.id}
              href={`/kategori/${categorySlug}/${categoryNameToSlug(child.name)}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {translateCategoryName(child.name, locale)}
            </Link>
          ))}
        </div>
      )}

      {products.length > 0 ? (
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
        </div>
      ) : (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)',
          }}
        >
          {parent ? t.emptySubcategory : t.emptyCategory}
        </div>
      )}
    </div>
  )
}
