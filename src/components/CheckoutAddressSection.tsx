'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { getAddresses, createAddress, deleteAddress } from '@/app/actions';
import TurkeyLocationSelect from '@/components/TurkeyLocationSelect';

type Address = {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
};

type Props = {
  userId: string;
  disabled: boolean;
  selectedAddressId: string | null;
  onSelectAddress: (id: string | null) => void;
  onSchemaReady: (ready: boolean) => void;
};

const emptyForm = {
  title: '',
  fullName: '',
  phone: '',
  city: '',
  district: '',
  addressLine: '',
  postalCode: '',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.9rem',
  backgroundColor: 'var(--bg-primary)',
};

export default function CheckoutAddressSection({
  userId,
  disabled,
  selectedAddressId,
  onSelectAddress,
  onSchemaReady,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    const result = await getAddresses(userId);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return null;
    }

    setSchemaReady(result.schemaReady);
    onSchemaReady(result.schemaReady);
    setAddresses(result.addresses);
    setLoading(false);
    return result;
  }, [userId, onSchemaReady]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      const result = await loadAddresses();
      if (cancelled || !result || !result.schemaReady) return;

      const preferred =
        result.addresses.find((address) => address.isDefault) ??
        result.addresses[0];
      if (preferred) onSelectAddress(preferred.id);
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [loadAddresses, onSelectAddress]);

  if (loading) {
    return (
      <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
        Adresler yükleniyor...
      </div>
    );
  }

  // Before the database cutover there is no address infrastructure; the
  // checkout silently behaves as before instead of blocking orders.
  if (!schemaReady) return null;

  const handleFormChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await createAddress(userId, {
        ...form,
        postalCode: form.postalCode || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      setForm(emptyForm);
      setShowForm(false);
      await loadAddresses();
      onSelectAddress(result.address.id);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;

    const result = await deleteAddress(userId, addressId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (selectedAddressId === addressId) onSelectAddress(null);
    await loadAddresses();
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--border)',
        marginBottom: '1.5rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <MapPin size={20} /> Teslimat Adresi
      </h2>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#b91c1c',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {addresses.length === 0 && !showForm && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Kayıtlı adresiniz yok. Sipariş verebilmek için bir teslimat adresi
          ekleyin.
        </p>
      )}

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        {addresses.map((address) => (
          <label
            key={address.id}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              padding: '1rem',
              borderRadius: '0.5rem',
              border:
                selectedAddressId === address.id
                  ? '2px solid var(--accent-primary)'
                  : '1px solid var(--border)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <input
              type="radio"
              name="deliveryAddress"
              checked={selectedAddressId === address.id}
              onChange={() => onSelectAddress(address.id)}
              disabled={disabled}
              style={{ marginTop: '0.25rem' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {address.title}
                {address.isDefault && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    Varsayılan
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {address.fullName} · {address.phone}
                <br />
                {address.addressLine}
                <br />
                {address.district} / {address.city}
                {address.postalCode ? ` · ${address.postalCode}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                handleDelete(address.id);
              }}
              disabled={disabled}
              aria-label={`${address.title} adresini sil`}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              <Trash2 size={16} />
            </button>
          </label>
        ))}
      </div>

      {showForm ? (
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              style={inputStyle}
              placeholder="Adres başlığı (örn. Merkez Depo)"
              value={form.title}
              maxLength={80}
              onChange={(e) => handleFormChange('title', e.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Teslim alacak kişi"
              value={form.fullName}
              maxLength={160}
              onChange={(e) => handleFormChange('fullName', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <input
              style={inputStyle}
              placeholder="Telefon"
              value={form.phone}
              maxLength={32}
              onChange={(e) => handleFormChange('phone', e.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Posta kodu (isteğe bağlı)"
              value={form.postalCode}
              maxLength={16}
              onChange={(e) => handleFormChange('postalCode', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <TurkeyLocationSelect
              city={form.city}
              district={form.district}
              onCityChange={(city) => {
                setForm((current) => ({ ...current, city, district: '' }));
              }}
              onDistrictChange={(district) =>
                setForm((current) => ({ ...current, district }))
              }
              disabled={disabled || saving}
              inputStyle={inputStyle}
            />
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            placeholder="Açık adres (mahalle, sokak, no)"
            value={form.addressLine}
            maxLength={512}
            onChange={(e) => handleFormChange('addressLine', e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || disabled}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'Kaydediliyor...' : 'Adresi Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              disabled={saving}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            backgroundColor: 'transparent',
            border: '1px dashed var(--accent-primary)',
            borderRadius: '0.5rem',
            color: 'var(--accent-primary)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Yeni Adres Ekle
        </button>
      )}
    </div>
  );
}
