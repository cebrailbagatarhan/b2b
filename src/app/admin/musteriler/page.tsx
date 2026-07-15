'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Search, Settings, ShoppingCart, X } from 'lucide-react'

type CustomerStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED'

type SalesRep = {
  id: string
  name: string
  email: string
}

type Customer = {
  id: string
  name: string
  email: string
  companyCode: string | null
  status: CustomerStatus
  balance: number
  discountRate: number
  riskLimit: number
  salesRepId: string | null
  salesRep: SalesRep | null
  createdAt: string
  updatedAt: string
}

type CustomerDraft = {
  id: string
  status: CustomerStatus
  companyCode: string
  riskLimit: string
  discountPercent: string
  salesRepId: string
}

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
})

const statusLabels: Record<CustomerStatus, string> = {
  PENDING_APPROVAL: 'Onay bekliyor',
  ACTIVE: 'Aktif',
  SUSPENDED: 'Askıda',
}

const statusStyles: Record<
  CustomerStatus,
  { color: string; backgroundColor: string }
> = {
  PENDING_APPROVAL: { color: '#9a3412', backgroundColor: '#ffedd5' },
  ACTIVE: { color: '#047857', backgroundColor: '#d1fae5' },
  SUSPENDED: { color: '#b91c1c', backgroundColor: '#fee2e2' },
}

function toDraft(customer: Customer): CustomerDraft {
  return {
    id: customer.id,
    status: customer.status,
    companyCode: customer.companyCode ?? '',
    riskLimit: String(customer.riskLimit),
    discountPercent: String(customer.discountRate * 100),
    salesRepId: customer.salesRepId ?? '',
  }
}

function parseLocalizedNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

export default function MusterilerPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [canManageTerms, setCanManageTerms] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CustomerDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [savingCustomerId, setSavingCustomerId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCustomers() {
      setLoadError('')
      try {
        const response = await fetch('/api/admin/customers', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Müşteriler yüklenemedi.')
        }

        setCustomers(result.customers as Customer[])
        setSalesReps(result.salesReps as SalesRep[])
        setCanManageTerms(Boolean(result.permissions?.canManageTerms))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(
          error instanceof Error ? error.message : 'Müşteriler yüklenemedi.'
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void fetchCustomers()
    return () => controller.abort()
  }, [])

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR')
    if (!normalizedQuery) return customers

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.companyCode ?? ''].some((value) =>
        value.toLocaleLowerCase('tr-TR').includes(normalizedQuery)
      )
    )
  }, [customers, query])

  const saveCustomer = async () => {
    if (!editing || !canManageTerms) return

    setSaveError('')
    const riskLimit = parseLocalizedNumber(editing.riskLimit)
    const discountPercent = parseLocalizedNumber(editing.discountPercent)

    if (!Number.isFinite(riskLimit) || riskLimit < 0) {
      setSaveError('Risk limiti sıfır veya daha büyük bir sayı olmalıdır.')
      return
    }

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      setSaveError('İskonto yüzdesi 0-100 arasında olmalıdır.')
      return
    }

    if (editing.status === 'ACTIVE' && !editing.companyCode.trim()) {
      setSaveError('Hesabı aktifleştirmek için firma kodu gereklidir.')
      return
    }

    setSavingCustomerId(editing.id)
    try {
      const response = await fetch(`/api/admin/customers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:
            editing.status === 'PENDING_APPROVAL'
              ? undefined
              : editing.status,
          companyCode: editing.companyCode.trim() || null,
          riskLimit,
          discountRate: discountPercent / 100,
          salesRepId: editing.salesRepId || null,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Müşteri ayarları kaydedilemedi.')
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === result.customer.id ? result.customer : customer
        )
      )
      setEditing(null)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Müşteri ayarları kaydedilemedi.'
      )
    } finally {
      setSavingCustomerId(null)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}
          >
            Müşteriler
          </h1>
          <p style={{ marginTop: '0.35rem', color: '#64748b' }}>
            {canManageTerms
              ? 'Başvuruları onaylayın, cari limiti ve iskonto oranını güvenli biçimde tanımlayın.'
              : 'Yalnızca size atanmış müşteri kayıtlarını görüntülüyorsunuz.'}
          </p>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            minWidth: '280px',
            padding: '0.65rem 0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            backgroundColor: '#fff',
          }}
        >
          <Search size={17} color="#64748b" aria-hidden="true" />
          <span className="sr-only">Müşteri ara</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad, e-posta veya firma kodu"
            style={{ width: '100%', border: 0, outline: 0 }}
          />
        </label>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: '0.5rem',
            color: '#b91c1c',
            backgroundColor: '#fee2e2',
          }}
        >
          {loadError}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse' }}>
          <thead
            style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <tr>
              <th style={headerCellStyle}>Müşteri</th>
              <th style={headerCellStyle}>Durum</th>
              <th style={headerCellStyle}>Bakiye / Limit</th>
              <th style={headerCellStyle}>Satış Temsilcisi</th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <Fragment key={customer.id}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={bodyCellStyle}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {customer.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {customer.email}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Firma kodu: {customer.companyCode || 'Tanımlanmadı'} · İskonto: %
                      {(customer.discountRate * 100).toLocaleString('tr-TR')}
                    </div>
                  </td>
                  <td style={bodyCellStyle}>
                    <span
                      style={{
                        ...statusStyles[customer.status],
                        display: 'inline-block',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      {statusLabels[customer.status]}
                    </span>
                  </td>
                  <td style={bodyCellStyle}>
                    <div
                      style={{
                        fontWeight: 600,
                        color:
                          customer.balance > customer.riskLimit
                            ? '#dc2626'
                            : '#047857',
                      }}
                    >
                      {currencyFormatter.format(customer.balance)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Limit: {currencyFormatter.format(customer.riskLimit)}
                    </div>
                  </td>
                  <td style={bodyCellStyle}>
                    {customer.salesRep ? (
                      <>
                        <div style={{ color: '#0f172a' }}>
                          {customer.salesRep.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {customer.salesRep.email}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Atanmadı</span>
                    )}
                  </td>
                  <td style={{ ...bodyCellStyle, textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                      }}
                    >
                      {canManageTerms && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(toDraft(customer))
                            setSaveError('')
                          }}
                          style={secondaryButtonStyle}
                        >
                          <Settings size={16} /> Yönet
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={customer.status !== 'ACTIVE'}
                        onClick={() =>
                          router.push(
                            `/sepet/hizli-siparis?customerId=${customer.id}`
                          )
                        }
                        style={{
                          ...primaryButtonStyle,
                          opacity: customer.status === 'ACTIVE' ? 1 : 0.45,
                          cursor:
                            customer.status === 'ACTIVE'
                              ? 'pointer'
                              : 'not-allowed',
                        }}
                      >
                        <ShoppingCart size={16} /> Sipariş Gir
                      </button>
                    </div>
                  </td>
                </tr>

                {editing?.id === customer.id && (
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '1rem 1.25rem' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '1rem',
                          alignItems: 'end',
                        }}
                      >
                        <label style={fieldLabelStyle}>
                          Durum
                          <select
                            value={editing.status}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                status: event.target.value as CustomerStatus,
                              })
                            }
                            style={fieldInputStyle}
                          >
                            {editing.status === 'PENDING_APPROVAL' && (
                              <option value="PENDING_APPROVAL">
                                Onay bekliyor
                              </option>
                            )}
                            <option value="ACTIVE">Aktif / Onayla</option>
                            <option value="SUSPENDED">Askıya al</option>
                          </select>
                        </label>

                        <label style={fieldLabelStyle}>
                          Firma kodu
                          <input
                            value={editing.companyCode}
                            maxLength={64}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                companyCode: event.target.value,
                              })
                            }
                            style={fieldInputStyle}
                          />
                        </label>

                        <label style={fieldLabelStyle}>
                          Risk limiti (TRY)
                          <input
                            type="number"
                            min="0"
                            max="1000000000"
                            step="0.01"
                            value={editing.riskLimit}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                riskLimit: event.target.value,
                              })
                            }
                            style={fieldInputStyle}
                          />
                        </label>

                        <label style={fieldLabelStyle}>
                          İskonto (%)
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editing.discountPercent}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                discountPercent: event.target.value,
                              })
                            }
                            style={fieldInputStyle}
                          />
                        </label>

                        <label style={fieldLabelStyle}>
                          Satış temsilcisi
                          <select
                            value={editing.salesRepId}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                salesRepId: event.target.value,
                              })
                            }
                            style={fieldInputStyle}
                          >
                            <option value="">Atama yok</option>
                            {salesReps.map((salesRep) => (
                              <option key={salesRep.id} value={salesRep.id}>
                                {salesRep.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {saveError && (
                        <div
                          role="alert"
                          style={{ marginTop: '0.75rem', color: '#b91c1c' }}
                        >
                          {saveError}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '0.6rem',
                          marginTop: '1rem',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null)
                            setSaveError('')
                          }}
                          disabled={savingCustomerId === customer.id}
                          style={secondaryButtonStyle}
                        >
                          <X size={16} /> Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveCustomer()}
                          disabled={savingCustomerId === customer.id}
                          style={primaryButtonStyle}
                        >
                          <Save size={16} />
                          {savingCustomerId === customer.id
                            ? 'Kaydediliyor...'
                            : 'Kaydet'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            {visibleCustomers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  Gösterilecek müşteri bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const headerCellStyle: CSSProperties = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.875rem',
}

const bodyCellStyle: CSSProperties = {
  padding: '1rem',
  verticalAlign: 'middle',
}

const primaryButtonStyle: CSSProperties = {
  padding: '0.5rem 0.75rem',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '0.375rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
}

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  color: '#334155',
  backgroundColor: '#e2e8f0',
}

const fieldLabelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.4rem',
  color: '#334155',
  fontSize: '0.82rem',
  fontWeight: 600,
}

const fieldInputStyle: CSSProperties = {
  width: '100%',
  minHeight: '40px',
  padding: '0.55rem 0.65rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.4rem',
  backgroundColor: '#fff',
  color: '#0f172a',
}
