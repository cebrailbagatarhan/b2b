'use client'

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateCustomerProfile,
  changeCustomerPassword,
} from '@/app/actions'
import { useAuthStore } from '@/lib/store'
import { ORDER_STATUS_LABELS, parseOrderStatus } from '@/lib/order-status'
import TurkeyLocationSelect from '@/components/TurkeyLocationSelect'
import { formatTurkeyPhoneDisplay } from '@/lib/phone'

type Address = {
  id: string
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  addressLine: string
  postalCode: string | null
  isDefault: boolean
}

type RecentOrder = {
  id: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string | Date
  paymentMethod: string
}

type Props = {
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
    companyCode: string | null
    balance: number
    discountRate: number
    riskLimit: number
    status: string
    createdAt: string | Date
  }
  recentOrders: RecentOrder[]
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeZone: 'Europe/Istanbul',
})

function formatMoney(amount: number, currency = 'TRY') {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const statusLabels: Record<string, string> = {
  PENDING_APPROVAL: 'Onay bekliyor',
  ACTIVE: 'Aktif',
  SUSPENDED: 'Askıda',
}

const emptyAddress = {
  title: '',
  fullName: '',
  phone: '',
  city: '',
  district: '',
  addressLine: '',
  postalCode: '',
}

export default function AccountClient({ customer, recentOrders }: Props) {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const storeUser = useAuthStore((state) => state.user)

  const [name, setName] = useState(customer.name)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressSchemaReady, setAddressSchemaReady] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState(emptyAddress)
  const [savingAddress, setSavingAddress] = useState(false)

  const availableCredit = Math.max(0, customer.riskLimit - customer.balance)

  const loadAddresses = useCallback(async () => {
    const result = await getAddresses(customer.id)
    if (!result.success) {
      setAddressError(result.error)
      return
    }
    setAddressSchemaReady(result.schemaReady)
    setAddresses(result.addresses)
  }, [customer.id])

  useEffect(() => {
    async function initialLoad() {
      await loadAddresses()
    }
    void initialLoad()
  }, [loadAddresses])

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    setProfileError(null)
    setProfileMessage(null)
    try {
      const result = await updateCustomerProfile(customer.id, { name })
      if (!result.success) {
        setProfileError(result.error)
        return
      }
      setProfileMessage('Profil bilgileriniz güncellendi.')
      if (storeUser) {
        login({ ...storeUser, name: result.customer.name })
      }
      router.refresh()
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordMessage(null)
    try {
      if (newPassword !== confirmPassword) {
        setPasswordError('Yeni şifre tekrarı eşleşmiyor.')
        return
      }
      const result = await changeCustomerPassword(customer.id, {
        currentPassword,
        newPassword,
      })
      if (!result.success) {
        setPasswordError(result.error)
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      window.alert(
        'Şifreniz güncellendi. Güvenlik için yeni şifrenizle tekrar giriş yapın.'
      )
      logout()
      router.replace('/giris')
      router.refresh()
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveAddress = async () => {
    setSavingAddress(true)
    setAddressError(null)
    try {
      const result = await createAddress(customer.id, {
        ...addressForm,
        postalCode: addressForm.postalCode || undefined,
        isDefault: addresses.length === 0,
      })
      if (!result.success) {
        setAddressError(result.error)
        return
      }
      setAddressForm(emptyAddress)
      setShowAddressForm(false)
      await loadAddresses()
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    const result = await deleteAddress(customer.id, addressId)
    if (!result.success) {
      setAddressError(result.error)
      return
    }
    await loadAddresses()
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        <div style={statBox}>
          <span style={statLabel}>Cari bakiye</span>
          <strong style={statValue}>{formatMoney(customer.balance)}</strong>
        </div>
        <div style={statBox}>
          <span style={statLabel}>Risk limiti</span>
          <strong style={statValue}>{formatMoney(customer.riskLimit)}</strong>
        </div>
        <div style={statBox}>
          <span style={statLabel}>Kullanılabilir limit</span>
          <strong style={statValue}>{formatMoney(availableCredit)}</strong>
        </div>
        <div style={statBox}>
          <span style={statLabel}>İskonto</span>
          <strong style={statValue}>
            %{((customer.discountRate || 0) * 100).toFixed(0)}
          </strong>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <section style={panel}>
          <h2 style={panelTitle}>Hesap bilgileri</h2>
          <dl style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <dt style={fieldLabel}>E-posta</dt>
              <dd style={{ fontWeight: 600 }}>{customer.email}</dd>
            </div>
            <div>
              <dt style={fieldLabel}>Telefon</dt>
              <dd style={{ fontWeight: 600 }}>
                {customer.phone
                  ? formatTurkeyPhoneDisplay(customer.phone)
                  : 'Kayıtlı değil'}
              </dd>
            </div>
            <div>
              <dt style={fieldLabel}>Cari kod</dt>
              <dd style={{ fontWeight: 600 }}>
                {customer.companyCode || 'Henüz atanmadı'}
              </dd>
            </div>
            <div>
              <dt style={fieldLabel}>Durum</dt>
              <dd style={{ fontWeight: 600 }}>
                {statusLabels[customer.status] ?? customer.status}
              </dd>
            </div>
            <div>
              <dt style={fieldLabel}>Üyelik</dt>
              <dd style={{ fontWeight: 600 }}>
                {dateFormatter.format(new Date(customer.createdAt))}
              </dd>
            </div>
          </dl>

          <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={fieldLabel}>Ad soyad / firma adı</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                style={inputStyle}
              />
            </label>
            {profileError && <p style={errorText}>{profileError}</p>}
            {profileMessage && <p style={successText}>{profileMessage}</p>}
            <button type="submit" disabled={savingProfile} style={primaryButton}>
              {savingProfile ? 'Kaydediliyor...' : 'Bilgileri kaydet'}
            </button>
          </form>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Şifre değiştir</h2>
          <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={fieldLabel}>Mevcut şifre</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={fieldLabel}>Yeni şifre</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={fieldLabel}>Yeni şifre (tekrar)</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>
            {passwordError && <p style={errorText}>{passwordError}</p>}
            {passwordMessage && <p style={successText}>{passwordMessage}</p>}
            <button type="submit" disabled={savingPassword} style={primaryButton}>
              {savingPassword ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
            </button>
          </form>
        </section>
      </div>

      <section style={panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ ...panelTitle, marginBottom: 0 }}>Teslimat adreslerim</h2>
          {addressSchemaReady && !showAddressForm && (
            <button
              type="button"
              onClick={() => setShowAddressForm(true)}
              style={secondaryButton}
            >
              Yeni adres ekle
            </button>
          )}
        </div>

        {!addressSchemaReady ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Adres yönetimi için veritabanı geçişi henüz tamamlanmadı.
          </p>
        ) : (
          <>
            {addressError && <p style={{ ...errorText, marginBottom: '0.75rem' }}>{addressError}</p>}
            {addresses.length === 0 && !showAddressForm && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Kayıtlı teslimat adresiniz yok.
              </p>
            )}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {addresses.map((address) => (
                <div
                  key={address.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700 }}>
                      {address.title}
                      {address.isDefault && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          Varsayılan
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
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
                    onClick={() => handleDeleteAddress(address.id)}
                    style={{
                      ...secondaryButton,
                      color: '#b91c1c',
                      borderColor: '#fecaca',
                    }}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>

            {showAddressForm && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'grid',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: '1px dashed var(--border)',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    placeholder="Adres başlığı"
                    value={addressForm.title}
                    onChange={(e) =>
                      setAddressForm((c) => ({ ...c, title: e.target.value }))
                    }
                    style={inputStyle}
                  />
                  <input
                    placeholder="Teslim alacak kişi"
                    value={addressForm.fullName}
                    onChange={(e) =>
                      setAddressForm((c) => ({ ...c, fullName: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    placeholder="Telefon"
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm((c) => ({ ...c, phone: e.target.value }))
                    }
                    style={inputStyle}
                  />
                  <input
                    placeholder="Posta kodu (isteğe bağlı)"
                    value={addressForm.postalCode}
                    onChange={(e) =>
                      setAddressForm((c) => ({ ...c, postalCode: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                  }}
                >
                  <TurkeyLocationSelect
                    city={addressForm.city}
                    district={addressForm.district}
                    onCityChange={(city) =>
                      setAddressForm((c) => ({ ...c, city, district: '' }))
                    }
                    onDistrictChange={(district) =>
                      setAddressForm((c) => ({ ...c, district }))
                    }
                    disabled={savingAddress}
                    inputStyle={inputStyle}
                  />
                </div>
                <textarea
                  placeholder="Açık adres"
                  value={addressForm.addressLine}
                  onChange={(e) =>
                    setAddressForm((c) => ({ ...c, addressLine: e.target.value }))
                  }
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveAddress}
                    disabled={savingAddress}
                    style={primaryButton}
                  >
                    {savingAddress ? 'Kaydediliyor...' : 'Adresi kaydet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false)
                      setAddressError(null)
                    }}
                    style={secondaryButton}
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section style={panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ ...panelTitle, marginBottom: 0 }}>Son siparişler</h2>
          <Link href="/siparis-takip" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
            Tümünü gör
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Henüz siparişiniz yok.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recentOrders.map((order) => {
              const status = parseOrderStatus(order.status)
              return (
                <div
                  key={order.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.875rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {dateFormatter.format(new Date(order.createdAt))}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {formatMoney(order.totalAmount, order.currency)}
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {status ? ORDER_STATUS_LABELS[status] : order.status}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

const panel: CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  padding: '1.25rem',
}

const panelTitle: CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  marginBottom: '1rem',
}

const fieldLabel: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  backgroundColor: 'var(--bg-primary)',
  fontSize: '0.9rem',
}

const primaryButton: CSSProperties = {
  padding: '0.7rem 1.1rem',
  backgroundColor: 'var(--accent-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.5rem',
  fontWeight: 600,
  cursor: 'pointer',
  justifySelf: 'start',
}

const secondaryButton: CSSProperties = {
  padding: '0.5rem 0.9rem',
  backgroundColor: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const errorText: CSSProperties = {
  color: '#b91c1c',
  fontSize: '0.875rem',
}

const successText: CSSProperties = {
  color: '#15803d',
  fontSize: '0.875rem',
}

const statBox: CSSProperties = {
  ...panel,
  padding: '1rem',
}

const statLabel: CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
  marginBottom: '0.35rem',
}

const statValue: CSSProperties = {
  fontSize: '1.15rem',
}
