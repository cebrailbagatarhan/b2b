'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft } from 'lucide-react';
import { createFullProduct } from '../../actions';
import { getCategories } from '@/app/actions';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [stockCode, setStockCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [unitName, setUnitName] = useState('Adet');
  const [multiplier, setMultiplier] = useState('1');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadCats() {
      const cats = await getCategories();
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    }
    loadCats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !stockCode || !price || !categoryId || stockQuantity === '' || minStockLevel === '') return;

    setUploading(true);

    try {
      let imageUrl = '';

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        } else {
          alert('Görsel yükleme başarısız.');
          setUploading(false);
          return;
        }
      }

      const res = await createFullProduct({
        stockCode,
        name,
        description,
        categoryId,
        imageUrl,
        price: parseFloat(price),
        unitName,
        multiplier: parseInt(multiplier, 10),
        stockQuantity: parseInt(stockQuantity, 10),
        minStockLevel: parseInt(minStockLevel, 10),
      });

      if (res.success) {
        router.push('/admin/urunler');
      } else {
        alert('Ürün eklenirken hata: ' + res.error);
      }
    } catch (error) {
      console.error(error);
      alert('Beklenmeyen bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/urunler" style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Yeni Ürün Ekle</h1>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Ürün Adı *</label>
              <input 
                type="text" value={name} onChange={e => setName(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Stok Kodu *</label>
              <input 
                type="text" value={stockCode} onChange={e => setStockCode(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Başlangıç Stoku *</label>
              <input
                type="number" min="0" step="1" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Minimum Stok Seviyesi *</label>
              <input
                type="number" min="0" step="1" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Kategori *</label>
            <select 
              value={categoryId} onChange={e => setCategoryId(e.target.value)} required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Açıklama</label>
            <textarea 
              value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Birim Fiyat (TL) *</label>
              <input 
                type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Satış Birimi *</label>
              <select 
                value={unitName} onChange={e => setUnitName(e.target.value)} required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
              >
                <option value="Adet">Adet</option>
                <option value="Kutu">Kutu</option>
                <option value="Koli">Koli</option>
                <option value="Paket">Paket</option>
                <option value="Takım">Takım</option>
                <option value="KG">KG</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Birim Çarpanı *</label>
              <input 
                type="number" min="1" value={multiplier} onChange={e => setMultiplier(e.target.value)} required
                title="Örn: Koli seçtiyseniz 1 kolide kaç adet varsa buraya yazın (Adet ise 1)."
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Ürün Görseli</label>
            <input 
              type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
            />
          </div>

          <button 
            type="submit" disabled={uploading}
            style={{ 
              alignSelf: 'flex-start', padding: '0.75rem 2rem', backgroundColor: 'var(--accent-primary)',
              color: 'white', border: 'none', borderRadius: '0.5rem', display: 'flex', 
              alignItems: 'center', gap: '0.5rem', cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 500, marginTop: '1rem'
            }}
          >
            <Package size={20} />
            {uploading ? 'Kaydediliyor...' : 'Ürünü Ekle'}
          </button>
        </form>
      </div>
    </div>
  );
}
