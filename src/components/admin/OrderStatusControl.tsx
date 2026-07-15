'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/app/admin/actions';

type Props = {
  orderId: string;
  options: { value: string; label: string }[];
};

export default function OrderStatusControl({ orderId, options }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  const handleApply = async () => {
    if (!selected) return;
    if (
      selected === 'CANCELLED' &&
      !confirm(
        'Sipariş iptal edilecek; stok geri yüklenir ve cari borç varsa geri alınır. Emin misiniz?'
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await updateOrderStatus(orderId, selected);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelected('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={busy}
          aria-label="Yeni sipariş durumu"
          style={{
            padding: '0.375rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.8125rem',
            backgroundColor: '#fff',
            color: '#334155',
          }}
        >
          <option value="">Durum değiştir...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={busy || !selected}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: selected ? '#2563eb' : '#e2e8f0',
            color: selected ? '#fff' : '#94a3b8',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: busy || !selected ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '...' : 'Uygula'}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: '0.375rem', color: '#b91c1c', fontSize: '0.75rem', maxWidth: '220px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
