import { getChildCategoryBySlugs } from '@/app/actions'
import ProductCard from '@/components/ProductCard'
import { categoryNameToSlug } from '@/lib/category-slug'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ChildCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; childSlug: string }>
}) {
  const { slug, childSlug } = await params
  const category = await getChildCategoryBySlugs(slug, childSlug)

  if (!category) {
    notFound()
  }

  const parentSlug = categoryNameToSlug(category.parent.name)

  return (
    <main
      className="container"
      style={{
        paddingTop: 'var(--spacing-xl)',
        paddingBottom: 'var(--spacing-2xl)',
      }}
    >
      <nav
        aria-label="Sayfa yolu"
        style={{
          marginBottom: 'var(--spacing-lg)',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Link href="/" style={{ color: 'var(--accent-primary)' }}>
          Ana Sayfa
        </Link>
        {' / '}
        <Link
          href={`/kategori/${parentSlug}`}
          style={{ color: 'var(--accent-primary)' }}
        >
          {category.parent.name}
        </Link>
        {' / '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {category.name}
        </span>
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
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            {category.parent.name}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{category.name}</h1>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {category.products.length} ürün
        </span>
      </div>

      {category.products.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 'var(--spacing-lg)',
          }}
        >
          {category.products.map((product) => (
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
          Bu alt kategoride henüz ürün bulunmuyor.
        </div>
      )}
    </main>
  )
}
