import { getProducts } from './actions';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import HeroSlider from '@/components/HeroSlider';

export default async function Home() {
  const products = await getProducts();
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      
      {/* Hero Slider - at the top */}
      <HeroSlider banners={banners} />

      {/* Featured Products */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Öne Çıkan Ürünler</h1>
          <Link href="/kategoriler" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 500 }}>Tümünü Gör &rarr;</Link>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: 'var(--spacing-lg)' 
        }}>
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
              Veritabanında henüz ürün bulunmuyor. <code>npx tsx prisma/seed.ts</code> komutu ile örnek veri ekleyin.
            </div>
          )}
        </div>
      </section>

      {/* Campaign Banner */}
      <section style={{ marginTop: 'var(--spacing-2xl)', marginBottom: 'var(--spacing-2xl)' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
          borderRadius: 'var(--radius-xl)', 
          padding: '3rem', 
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>🔥 TopTan Market Kampanyası Başladı!</h2>
          <p style={{ maxWidth: 600, opacity: 0.9, lineHeight: 1.6 }}>
            Seçili hırdavat ve züccaciye ürünlerinde %20&apos;ye varan bayi iskontoları sizi bekliyor. 
            Hemen sipariş verin, kazançlı çıkın.
          </p>
          <Link href="/kampanyalar" style={{ 
            backgroundColor: 'white', 
            color: '#1e3a8a', 
            padding: '0.75rem 2rem', 
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
            fontSize: '0.95rem',
            marginTop: '0.5rem',
            cursor: 'pointer',
            border: 'none',
            display: 'inline-block',
          }}>
            Kampanyaları İncele
          </Link>
        </div>
      </section>

    </div>
  );
}
