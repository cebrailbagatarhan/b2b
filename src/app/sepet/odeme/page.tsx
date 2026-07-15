'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Building2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'TRANSFER' | 'OPEN_ACCOUNT'>('CREDIT_CARD');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressRequired, setAddressRequired] = useState(false);
  const isMounted = useHydrated();
  const idempotencyKeyRef = useRef<string | null>(null);

  const changePaymentMethod = (
    nextMethod: 'CREDIT_CARD' | 'TRANSFER' | 'OPEN_ACCOUNT'
  ) => {
    if (loading || nextMethod === paymentMethod) return;
    setPaymentMethod(nextMethod);
    // A changed payment method is a new order intent. Failed retries of the
    // same intent keep their key, but a different payload must receive a new one.
    idempotencyKeyRef.current = null;
  };

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
    if (!effectiveUser) {
      alert('Sipariş vermek için giriş yapmalısınız.');
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
          Teşekkür ederiz. Siparişiniz başarıyla sistemimize düştü. {paymentMethod === 'CREDIT_CARD' && 'Kart bilgisi alınmadı; siparişiniz güvenli ödeme sağlayıcısı entegrasyonu tamamlanana kadar ödeme bekliyor.'} {paymentMethod === 'TRANSFER' && 'Havale/EFT işleminiz onaylandıktan sonra ürünleriniz kargoya verilecektir.'}
          {paymentMethod === 'OPEN_ACCOUNT' && 'Tutar cari hesabınıza işlendi ve siparişiniz onaylandı. En kısa sürede kargolanacaktır.'}
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

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              type="button"
              onClick={() => changePaymentMethod('CREDIT_CARD')}
              disabled={loading}
              style={{ flex: 1, padding: '1rem', border: paymentMethod === 'CREDIT_CARD' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, color: paymentMethod === 'CREDIT_CARD' ? 'var(--accent-primary)' : 'inherit' }}
            >
              <CreditCard size={20} /> Kredi Kartı
            </button>
            <button 
              type="button"
              onClick={() => changePaymentMethod('TRANSFER')}
              disabled={loading}
              style={{ flex: 1, padding: '1rem', border: paymentMethod === 'TRANSFER' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, color: paymentMethod === 'TRANSFER' ? 'var(--accent-primary)' : 'inherit' }}
            >
              <Building2 size={20} /> Havale / EFT
            </button>
            {effectiveUser?.role === 'CUSTOMER' && (
              <button 
                type="button"
                onClick={() => changePaymentMethod('OPEN_ACCOUNT')}
                disabled={loading}
                style={{ flex: 1, padding: '1rem', border: paymentMethod === 'OPEN_ACCOUNT' ? '2px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 500, color: paymentMethod === 'OPEN_ACCOUNT' ? 'var(--accent-primary)' : 'inherit' }}
              >
                <Wallet size={20} /> Cari Hesap
              </button>
            )}
          </div>

          <form id="checkout-form" onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            
            {paymentMethod === 'CREDIT_CARD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Kredi Kartı ile Ödeme</h2>

                <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#1e3a8a' }}>
                  <p><strong>Güvenlik bilgisi:</strong> Ödeme sağlayıcısı henüz bağlı olmadığı için bu uygulama kart numarası, son kullanma tarihi veya CVV toplamaz. Sipariş “ödeme bekliyor” durumunda oluşturulur; gerçek ödeme yalnız sağlayıcının güvenli sayfasında alınmalıdır.</p>
                </div>
              </div>
            )}

            {paymentMethod === 'TRANSFER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Havale / EFT Bilgileri</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Lütfen ödemeyi aşağıdaki banka hesabımıza yapın. Açıklama kısmına kayıtlı telefon numaranızı veya e-postanızı yazmayı unutmayın.</p>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Banka</div>
                    <div style={{ fontWeight: 600 }}>Garanti BBVA</div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Alıcı Adı</div>
                    <div style={{ fontWeight: 600 }}>TopTan Market Tic. A.Ş.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>IBAN</div>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>TR00 0000 0000 0000 0000 0000 00</div>
                  </div>
                </div>
              </div>
            )}

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
                      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>Bu sipariş risk limitinizi aştığı için Cari Hesap ile ödeme yapamazsınız. Lütfen Havale/EFT veya Kredi Kartı seçeneğini kullanın.</p>
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
              const submitDisabled = loading || overLimit || missingAddress;

              return (
                <>
                  {missingAddress && (
                    <p style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#b45309', textAlign: 'center' }}>
                      Sipariş için teslimat adresi seçmelisiniz.
                    </p>
                  )}
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitDisabled}
                    style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: submitDisabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: submitDisabled ? 0.6 : 1 }}
                  >
                    {loading ? 'İşleniyor...' : (paymentMethod === 'CREDIT_CARD' ? 'Sipariş Oluştur (Ödeme Bekler)' : paymentMethod === 'OPEN_ACCOUNT' ? 'Cari ile Sipariş Ver' : 'Siparişi Onayla')}
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
