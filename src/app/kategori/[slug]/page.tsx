import { getCategoryBySlug } from '@/app/actions';
import ProductCard from '@/components/ProductCard';
import { categoryNameToSlug } from '@/lib/category-slug';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const categorySlug = categoryNameToSlug(category.name);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Link href="/" style={{ color: 'var(--accent-primary)' }}>Ana Sayfa</Link>
        {' / '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{category.name}</span>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{category.name}</h1>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {category.products.length} ürün
        </span>
      </div>

      {/* Sub-categories */}
      {category.children.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-xl)',
          flexWrap: 'wrap',
        }}>
          {category.children.map((child) => (
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
                transition: 'all 0.2s',
              }}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 'var(--spacing-lg)',
      }}>
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {category.products.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-secondary)',
        }}>
          Bu kategoride henüz ürün bulunmuyor.
        </div>
      )}
    </div>
  );
}
