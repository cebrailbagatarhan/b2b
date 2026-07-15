import { searchProducts } from '@/app/actions';
import ProductCard from '@/components/ProductCard';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const products = query.length >= 2 ? await searchProducts(query) : [];

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Arama Sonuçları
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {query ? (
            <>
              &quot;<strong>{query}</strong>&quot; için {products.length} sonuç bulundu.
            </>
          ) : (
            'Arama yapmak için en az 2 karakter girin.'
          )}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 'var(--spacing-lg)',
      }}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {query && products.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-secondary)',
        }}>
          Aramanızla eşleşen ürün bulunamadı. Farklı anahtar kelimeler deneyin.
        </div>
      )}
    </div>
  );
}
