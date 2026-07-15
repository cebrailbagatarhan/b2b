'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Plus, Trash2, CheckCircle2, AlertCircle, User as UserIcon } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { getProductsByStockCodes } from '@/app/actions';

type Row = {
  stockCode: string;
  quantity: number;
};

function BulkOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId');
  
  const { user, proxyUser, setProxyUser } = useAuthStore();
  const addToCart = useCartStore(s => s.addToCart);

  const effectiveUser = proxyUser || user;

  const [rows, setRows] = useState<Row[]>([{ stockCode: '', quantity: 1 }, { stockCode: '', quantity: 1 }, { stockCode: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ successCount: number; errors: string[] } | null>(null);

  useEffect(() => {
    async function loadProxy() {
      if (customerId && user?.role === 'ADMIN') {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        const data = await res.json();
        if (data.success && data.customer) {
          setProxyUser({
            ...data.customer,
            role: 'CUSTOMER'
          });
        }
      }
    }
    loadProxy();
  }, [customerId, user, setProxyUser]);

  const addRow = () => setRows([...rows, { stockCode: '', quantity: 1 }]);
  
  const updateRow = (index: number, field: keyof Row, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleBulkAdd = async () => {
    setLoading(true);
    setResults(null);
    try {
      // Filter out empty rows
      const validRows = rows.filter(r => r.stockCode.trim() !== '' && r.quantity > 0);
      if (validRows.length === 0) {
        alert('Lütfen en az bir geçerli stok kodu girin.');
        setLoading(false);
        return;
      }

      const codes = validRows.map(r => r.stockCode.trim());
      const products = await getProductsByStockCodes(codes);

      let successCount = 0;
      const errors: string[] = [];

      for (const row of validRows) {
        const product = products.find(p => p.stockCode.toLowerCase() === row.stockCode.toLowerCase().trim());
        if (!product) {
          errors.push(`Stok Kodu Bulunamadı: ${row.stockCode}`);
          continue;
        }

        const priceObj = product.prices[0];
        const unitObj = product.units[0]; // Varsayılan birim

        if (!priceObj || !unitObj) {
          errors.push(`Fiyat/Birim Eksik: ${row.stockCode}`);
          continue;
        }

        const discountRate = effectiveUser?.discountRate || 0;
        const finalPrice = priceObj.price * (1 - discountRate);

        addToCart({
          productId: product.id,
          productName: product.name,
          stockCode: product.stockCode,
          unitId: unitObj.id,
          unitName: unitObj.unitName,
          multiplier: unitObj.multiplier,
          quantity: row.quantity,
          unitPrice: finalPrice,
          currency: priceObj.currency
        });

        successCount++;
      }

      setResults({ successCount, errors });
      
      // Clear rows if all successful
      if (errors.length === 0) {
        setRows([{ stockCode: '', quantity: 1 }, { stockCode: '', quantity: 1 }]);
      }

    } catch {
      alert('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 0', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <ShoppingBag size={32} color="var(--accent-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Hızlı Sipariş</h1>
      </div>

      {proxyUser && (
        <div style={{ padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1e40af' }}>
          <UserIcon size={20} />
          <span>Şu an <strong>{proxyUser.name}</strong> adına sipariş giriyorsunuz. İskonto oranı: <strong>%{((proxyUser.discountRate||0)*100).toFixed(0)}</strong></span>
        </div>
      )}

      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Toptan siparişlerinizi hızla girmek için aşağıdaki tabloyu kullanın. Stok kodunu ve adet miktarını yazarak saniyeler içinde sepetinize ekleyebilirsiniz.
      </p>

      {results && (
        <div style={{ marginBottom: '2rem' }}>
          {results.successCount > 0 && (
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', color: '#15803d', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <CheckCircle2 size={20} />
              <strong>{results.successCount} ürün sepete başarıyla eklendi.</strong>
            </div>
          )}
          {results.errors.length > 0 && (
            <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>
                <AlertCircle size={20} /> Bazı ürünler eklenemedi:
              </div>
              <ul style={{ paddingLeft: '1.5rem', margin: 0, fontSize: '0.9rem' }}>
                {results.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: '1rem', marginBottom: '1rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
          <div>Stok Kodu</div>
          <div>Adet</div>
          <div></div>
        </div>

        {rows.map((row, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Örn: H001, OY003"
              value={row.stockCode}
              onChange={(e) => updateRow(index, 'stockCode', e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
            />
            <input 
              type="number" 
              min={1}
              value={row.quantity}
              onChange={(e) => updateRow(index, 'quantity', parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}
            />
            <button 
              onClick={() => removeRow(index)}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }}
              title="Satırı Sil"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px dashed var(--border)', padding: '0.75rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' }}
          >
            <Plus size={18} /> Yeni Satır Ekle
          </button>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {results?.successCount && results.successCount > 0 ? (
              <button 
                onClick={() => router.push('/sepet')}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Sepete Git
              </button>
            ) : null}
            <button 
              onClick={handleBulkAdd}
              disabled={loading}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
            >
              <ShoppingBag size={18} />
              {loading ? 'Ekleniyor...' : 'Tümünü Sepete Ekle'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BulkOrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Yükleniyor...</div>}>
      <BulkOrderContent />
    </Suspense>
  );
}
