'use client'

import Link from 'next/link'
import { ArrowRight, Boxes, Package } from 'lucide-react'
import {
  formatProductCount,
  translateCategoryName,
} from '@/lib/i18n'
import { useLocale, useT } from '@/lib/use-t'

const categorySlugs: Record<string, string> = {
  Hırdavat: 'hirdavat',
  Oyuncak: 'oyuncak',
  Kırtasiye: 'kirtasiye',
  Züccaciye: 'zuccaciye',
  Kozmetik: 'kozmetik',
  Tekstil: 'tekstil',
}

type CategoryItem = {
  id: string
  name: string
  _count: { products: number }
  children: { id: string; name: string }[]
}

export default function CategoriesList({ categories }: { categories: CategoryItem[] }) {
  const t = useT()
  const locale = useLocale()

  return (
    <main
      className="container"
      style={{
        paddingTop: 'var(--spacing-xl)',
        paddingBottom: 'var(--spacing-2xl)',
        minHeight: '50vh',
      }}
    >
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <p
          style={{
            color: 'var(--accent-primary)',
            fontWeight: 600,
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          {t.catalogEyebrow}
        </p>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          {t.catalogTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
          {t.catalogDesc}
        </p>
      </div>

      {categories.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--spacing-lg)',
          }}
        >
          {categories.map((category) => {
            const slug = categorySlugs[category.name]
            const content = (
              <>
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent-primary)',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  <Boxes size={24} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-xs)' }}>
                  {translateCategoryName(category.name, locale)}
                </h2>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    marginBottom: 'var(--spacing-md)',
                  }}
                >
                  {formatProductCount(category._count.products, locale)}
                  {category.children.length > 0 &&
                    ` · ${t.subCategoryCount.replace('{n}', String(category.children.length))}`}
                </p>
                {category.children.length > 0 && (
                  <p
                    style={{
                      color: 'var(--text-tertiary)',
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      marginBottom: 'var(--spacing-md)',
                    }}
                  >
                    {category.children
                      .map((child) => translateCategoryName(child.name, locale))
                      .join(', ')}
                  </p>
                )}
                <span
                  style={{
                    marginTop: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: slug ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {slug ? t.viewProducts : t.categoryPreparing}
                  {slug && <ArrowRight size={16} aria-hidden="true" />}
                </span>
              </>
            )

            const cardStyle = {
              display: 'flex',
              flexDirection: 'column' as const,
              minHeight: '230px',
              padding: 'var(--spacing-lg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-sm)',
            }

            return slug ? (
              <Link key={category.id} href={`/kategori/${slug}`} style={cardStyle}>
                {content}
              </Link>
            ) : (
              <article key={category.id} style={cardStyle}>
                {content}
              </article>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            color: 'var(--text-secondary)',
          }}
        >
          <Package size={36} style={{ marginBottom: 'var(--spacing-sm)' }} aria-hidden="true" />
          <p>{t.emptyCategories}</p>
        </div>
      )}
    </main>
  )
}
