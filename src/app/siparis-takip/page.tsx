import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireVerifiedSession } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'
import {
  hasAddressSchema,
  hasOrderIntegritySchema,
} from '@/lib/customer-schema-compat'

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  PENDING_PAYMENT: 'Ödeme bekliyor',
  PENDING_TRANSFER: 'Havale bekliyor',
  APPROVED: 'Onaylandı',
  PAID: 'Ödendi',
  PROCESSING: 'Hazırlanıyor',
  SHIPPED: 'Kargoya verildi',
  COMPLETED: 'Tamamlandı',
  DELIVERED: 'Teslim edildi',
  CANCELLED: 'İptal edildi',
}

const paymentLabels: Record<string, string> = {
  CREDIT_CARD: 'Kredi kartı',
  OPEN_ACCOUNT: 'Cari hesap',
  TRANSFER: 'Havale / EFT',
}

const statusStyles: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  PENDING: { backgroundColor: '#fff7ed', color: '#c2410c' },
  PENDING_PAYMENT: { backgroundColor: '#fff7ed', color: '#c2410c' },
  PENDING_TRANSFER: { backgroundColor: '#fff7ed', color: '#c2410c' },
  APPROVED: { backgroundColor: '#ecfdf5', color: '#047857' },
  PAID: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  PROCESSING: { backgroundColor: '#f5f3ff', color: '#6d28d9' },
  SHIPPED: { backgroundColor: '#ecfeff', color: '#0e7490' },
  COMPLETED: { backgroundColor: '#f0fdf4', color: '#15803d' },
  DELIVERED: { backgroundColor: '#f0fdf4', color: '#15803d' },
  CANCELLED: { backgroundColor: '#fef2f2', color: '#b91c1c' },
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
})

export default async function OrderTrackingPage() {
  let session

  try {
    session = await requireVerifiedSession()
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect('/giris')
    }

    throw error
  }

  if (session.role === 'ADMIN') {
    redirect('/admin/siparisler')
  }

  if (!(await hasOrderIntegritySchema())) {
    return (
      <div className="container" style={{ padding: '3rem 0', minHeight: '50vh' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Siparişlerim</h1>
        <p style={{ marginTop: '1rem', color: '#b45309' }}>
          Yeni sipariş takip ekranı için veritabanı geçişi henüz tamamlanmadı.
        </p>
      </div>
    )
  }

  const addressReady = await hasAddressSchema()

  const baseSelect = {
    id: true,
    status: true,
    paymentMethod: true,
    subtotalAmount: true,
    discountRate: true,
    discountAmount: true,
    totalAmount: true,
    currency: true,
    createdAt: true,
    items: {
      orderBy: { createdAt: 'asc' as const },
      select: {
        id: true,
        stockCode: true,
        productName: true,
        unitName: true,
        quantity: true,
        unitMultiplier: true,
        unitPrice: true,
        subtotalAmount: true,
        discountAmount: true,
        totalAmount: true,
        currency: true,
      },
    },
  }

  // The shipping columns only exist after the address migration; selecting
  // them earlier would fail against the live database.
  const orders = addressReady
    ? await prisma.order.findMany({
        where: { customerId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          ...baseSelect,
          shippingTitle: true,
          shippingFullName: true,
          shippingPhone: true,
          shippingCity: true,
          shippingDistrict: true,
          shippingAddressLine: true,
          shippingPostalCode: true,
        },
      })
    : (
        await prisma.order.findMany({
          where: { customerId: session.userId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: baseSelect,
        })
      ).map((order) => ({
        ...order,
        shippingTitle: null,
        shippingFullName: null,
        shippingPhone: null,
        shippingCity: null,
        shippingDistrict: null,
        shippingAddressLine: null,
        shippingPostalCode: null,
      }))

  return (
    <div
      className="container"
      style={{
        paddingTop: 'var(--spacing-2xl)',
        paddingBottom: 'var(--spacing-2xl)',
        minHeight: '50vh',
      }}
    >
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          Siparişlerim
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          En yeni 100 siparişiniz aşağıda listelenir.
        </p>
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            padding: 'var(--spacing-xl)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-card)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-sm)' }}>
            Henüz siparişiniz yok
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Vereceğiniz siparişlerin durumunu burada güvenli biçimde takip
            edebilirsiniz.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {orders.map((order) => {
            const badgeStyle =
              statusStyles[order.status] ?? {
                backgroundColor: '#f1f5f9',
                color: '#475569',
              }

            return (
              <article
                key={order.id}
                style={{
                  padding: 'var(--spacing-lg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: 'var(--spacing-md)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Sipariş No
                  </p>
                  <p style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                    {order.id}
                  </p>
                  </div>

                  <div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Tarih
                  </p>
                  <p style={{ fontWeight: 600 }}>
                    {dateFormatter.format(order.createdAt)}
                  </p>
                  </div>

                  <div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Ödeme
                  </p>
                  <p style={{ fontWeight: 600 }}>
                    {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
                  </p>
                  </div>

                  <div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Tutar
                  </p>
                  <p style={{ fontWeight: 700 }}>
                    {formatMoney(order.totalAmount, order.currency)}
                  </p>
                  </div>

                  <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      ...badgeStyle,
                    }}
                  >
                    {statusLabels[order.status] ?? order.status}
                  </span>
                  </div>
                </div>

                {order.shippingCity && (
                  <div
                    style={{
                      marginTop: 'var(--spacing-md)',
                      paddingTop: 'var(--spacing-md)',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                      Teslimat adresi{order.shippingTitle ? ` · ${order.shippingTitle}` : ''}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {order.shippingFullName} · {order.shippingPhone}
                      <br />
                      {order.shippingAddressLine}
                      <br />
                      {order.shippingDistrict} / {order.shippingCity}
                      {order.shippingPostalCode ? ` · ${order.shippingPostalCode}` : ''}
                    </p>
                  </div>
                )}

                <details
                  style={{
                    marginTop: 'var(--spacing-md)',
                    paddingTop: 'var(--spacing-md)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    Sipariş kalemleri ({order.items.length})
                  </summary>

                  {order.items.length === 0 ? (
                    <p
                      style={{
                        marginTop: 'var(--spacing-md)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Bu eski sipariş için kalem snapshot verisi bulunmuyor.
                    </p>
                  ) : (
                    <div style={{ marginTop: 'var(--spacing-md)', display: 'grid', gap: '0.75rem' }}>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            gap: 'var(--spacing-md)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 700 }}>{item.productName}</p>
                            <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              Kod: {item.stockCode} · {item.quantity} × {item.unitName}
                              {item.unitMultiplier > 1 ? ` (${item.unitMultiplier} adet)` : ''}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 700 }}>
                              {formatMoney(item.totalAmount, item.currency)}
                            </p>
                            {item.discountAmount > 0 && (
                              <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                İndirim: {formatMoney(item.discountAmount, item.currency)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      <div style={{ marginTop: '0.25rem', textAlign: 'right', lineHeight: 1.7 }}>
                        <p>Ara toplam: {formatMoney(order.subtotalAmount, order.currency)}</p>
                        {order.discountAmount > 0 && (
                          <p>
                            İndirim (%{(order.discountRate * 100).toFixed(2)}):{' '}
                            -{formatMoney(order.discountAmount, order.currency)}
                          </p>
                        )}
                        <p style={{ fontWeight: 700 }}>
                          Toplam: {formatMoney(order.totalAmount, order.currency)}
                        </p>
                      </div>
                    </div>
                  )}
                </details>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
