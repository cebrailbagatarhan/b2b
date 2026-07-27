'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { useHydrated } from '@/lib/use-hydrated';
import { createOrder } from '@/app/actions';
import CheckoutAddressSection from '@/components/CheckoutAddressSection';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, proxyUser } = useAuthStore();
  const effectiveUser = proxyUser || user;
  const items = useCartStore(s => s.items);
  const totalAmount = useCartStore(s => s.totalAmount());
  const clearCart = useCartStore(s => s.clearCart);

  const paymentMethod = 'OPEN_ACCOUNT' as const;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressRequired, setAddressRequired] = useState(false);
  const isMounted = useHydrated();
  const idempotencyKeyRef = useRef<string | null>(null);

  const handleSelectAddress = useCallback((addressId: string | null) => {
    setSelectedAddressId((current) => {
      // A changed delivery address is also a new order intent.
      if (current !== addressId) idempotencyKeyRef.current = null;
      return addressId;
    });
  }, []);

  const handleAddressSchemaReady = useCallback((ready: boolean) => {
    setAddressRequired(ready);
  }, []);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUser || effectiveUser.role !== 'CUSTOMER') {
      alert('Cari sipariş vermek için aktif bir müşteri hesabı seçmelisiniz.');
      router.push('/giris');
      return;
    }

    if (addressRequired && !selectedAddressId) {
      alert('Lütfen bir teslimat adresi seçin veya ekleyin.');
      return;
    }

    setLoading(true);

    try {
      if (!idempotencyKeyRef.current) {
        if (typeof globalThis.crypto?.randomUUID !== 'function') {
          throw new Error('Güvenli sipariş anahtarı üretilemedi.');
        }
        idempotencyKeyRef.current = globalThis.crypto.randomUUID();
      }

      const res = await createOrder({
        userId: effectiveUser.id,
        items,
        paymentMethod,
        idempotencyKey: idempotencyKeyRef.current,
        addressId: selectedAddressId ?? undefined,
      });

      if (res.success) {
        clearCart();
        setCreatedOrderId(res.orderId);
        setSuccess(true);
      } else {
        alert('Sipariş oluşturulamadı: ' + res.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return <div style={{ padding: '4rem', textAlign: 'center' }}>Yükleniyor...</div>;

  if (success) {
    return (
      <div className="container" style={{ padding: '4rem 0', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Siparişiniz Alındı!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Teşekkür ederiz. Siparişiniz başarıyla sistemimize düştü. Tutar cari
          hesabınıza işlendi ve siparişiniz onaylandı. En kısa sürede
          hazırlanmaya başlayacaktır.
        </p>
        {createdOrderId && (
          <p style={{ marginBottom: '2rem', fontWeight: 600, overflowWrap: 'anywhere' }}>
            Sipariş numarası: {createdOrderId}
          </p>
        )}
        <button 
          onClick={() => router.push('/siparis-takip')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500 }}
        >
          Siparişlerimi Görüntüle
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Sepetiniz boş.</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 0' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Ödeme ve Onay</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Left Col - Payment Info */}
        <div>
          {effectiveUser && (
            <CheckoutAddressSection
              userId={effectiveUser.id}
              disabled={loading}
              selectedAddressId={selectedAddressId}
              onSelectAddress={handleSelectAddress}
              onSchemaReady={handleAddressSchemaReady}
            />
          )}

          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
              marginBottom: '2rem',
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--accent-primary)',
                fontWeight: 700,
              }}
            >
              <Wallet size={20} /> Cari Hesap
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Kredi kartı ve Havale/EFT; gerçek ödeme sağlayıcısı, doğrulanmış
              webhook, banka hesabı ve mutabakat süreci tamamlanana kadar
              güvenlik nedeniyle kapalıdır. Bu yöntemlerle sipariş oluşturulmaz
              ve stok tutulmaz.
            </p>
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            {paymentMethod === 'OPEN_ACCOUNT' && effectiveUser?.role === 'CUSTOMER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Cari Hesap Bilgileri {proxyUser ? `(${proxyUser.name})` : ''}</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Risk Limitiniz</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{formatPrice(effectiveUser.riskLimit || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Güncel Bakiye</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{formatPrice(effectiveUser.balance || 0)}</div>
                  </div>
                </div>

                {(effectiveUser.balance || 0) + totalAmount > (effectiveUser.riskLimit || 0) ? (
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Limit Yetersiz!</strong>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>Bu sipariş risk limitinizi aştığı için Cari Hesap ile sipariş veremezsiniz. Limit veya alternatif ödeme süreci için satış temsilcinizle iletişime geçin.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', color: '#15803d', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Limit Yeterli</strong>
                      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>Sipariş tutarı cari hesabınıza borç olarak işlenecektir.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </form>
        </div>

        {/* Right Col - Summary */}
        <div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sipariş Özeti</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {items.map(item => (
                <div key={`${item.productId}-${item.unitId}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--text-secondary)', paddingRight: '1rem' }}>
                    {item.quantity}x {item.productName} ({item.unitName})
                  </div>
                  <div style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatPrice(item.unitPrice * item.quantity * item.multiplier)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ara Toplam</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Kargo</span>
                <span style={{ color: 'var(--success)', fontWeight: 500 }}>Ücretsiz</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>
                <span>Toplam</span>
                <span style={{ color: 'var(--accent-primary)' }}>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {(() => {
              const overLimit =
                paymentMethod === 'OPEN_ACCOUNT' &&
                (effectiveUser?.balance || 0) + totalAmount > (effectiveUser?.riskLimit || 0);
              const missingAddress = addressRequired && !selectedAddressId;
              const missingCustomer = effectiveUser?.role !== 'CUSTOMER';
              const submitDisabled = loading || overLimit || missingAddress || missingCustomer;

              return (
                <>
                  {missingAddress && (
                    <p style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#b45309', textAlign: 'center' }}>
                      Sipariş için teslimat adresi seçmelisiniz.
                    </p>
                  )}
                  {missingCustomer && (
                    <p style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#b45309', textAlign: 'center' }}>
                      Cari sipariş için aktif bir müşteri hesabı seçmelisiniz.
                    </p>
                  )}
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitDisabled}
                    style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: submitDisabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: submitDisabled ? 0.6 : 1 }}
                  >
                    {loading ? 'İşleniyor...' : 'Cari ile Sipariş Ver'}
                  </button>
                </>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
