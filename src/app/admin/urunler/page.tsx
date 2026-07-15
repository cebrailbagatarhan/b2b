'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { deleteProduct } from '../actions';
import { getProducts } from '@/app/actions';

type Product = {
  id: string;
  stockCode: string;
  name: string;
  price: number;
};

import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    const data = await getProducts();
    // Map to a simpler type for the table
    const mapped = data.map(p => ({
      id: p.id,
      stockCode: p.stockCode,
      name: p.name,
      price: p.prices[0]?.price || 0,
    }));
    setProducts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function initialLoad() {
      await loadProducts();
    }
    initialLoad();
  }, [loadProducts]);

  const handleDelete = async (id: string) => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      await deleteProduct(id);
      await loadProducts();
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Ürün Yönetimi</h1>
        <Link 
          href="/admin/urunler/yeni"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#2563eb', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: 500
          }}
        >
          <Plus size={18} /> Yeni Ürün Ekle
        </Link>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Stok Kodu</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Ürün Adı</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>Fiyat</th>
              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>{product.stockCode}</td>
                <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>{product.name}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{product.price} TL</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                    title="Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Henüz ürün bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
