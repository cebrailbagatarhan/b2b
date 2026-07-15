import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/authorization'
import {
  hasAddressSchema,
  hasOrderIntegritySchema,
} from '@/lib/customer-schema-compat'
import {
  ORDER_STATUS_LABELS,
  canRoleSetStatus,
  nextStatusesFor,
  parseOrderStatus,
} from '@/lib/order-status'
import OrderStatusControl from '@/components/admin/OrderStatusControl'
import type { AdminRole } from '@/lib/session'

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

const paymentLabels: Record<string, string> = {
  CREDIT_CARD: 'Kredi Kartı',
  OPEN_ACCOUNT: 'Açık Hesap',
  TRANSFER: 'Havale / EFT',
}

const statusLabels: Record<string, string> = ORDER_STATUS_LABELS

function statusOptionsFor(status: string, adminRole: AdminRole) {
  const parsed = parseOrderStatus(status)
  if (!parsed) return []

  return nextStatusesFor(parsed)
    .filter((candidate) => canRoleSetStatus(adminRole, candidate))
    .map((candidate) => ({
      value: candidate,
      label: ORDER_STATUS_LABELS[candidate],
    }))
}

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  PENDING: { backgroundColor: '#fff7ed', color: '#c2410c' },
  PENDING_PAYMENT: { backgroundColor: '#fff7ed', color: '#c2410c' },
  PENDING_TRANSFER: { backgroundColor: '#fff7ed', color: '#c2410c' },
  APPROVED: { backgroundColor: '#ecfdf5', color: '#047857' },
  PAID: { backgroundColor: '#ecfdf5', color: '#047857' },
  PROCESSING: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
  SHIPPED: { backgroundColor: '#eef2ff', color: '#4338ca' },
  DELIVERED: { backgroundColor: '#f0fdf4', color: '#15803d' },
  COMPLETED: { backgroundColor: '#f0fdf4', color: '#15803d' },
  CANCELLED: { backgroundColor: '#fef2f2', color: '#b91c1c' },
}

const fallbackStatusStyle = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
}

export default async function AdminOrdersPage() {
  const admin = await requireAdmin([
    'SUPERADMIN',
    'SALES_REP',
    'WAREHOUSE',
    'ACCOUNTING',
  ])
  if (!(await hasOrderIntegritySchema())) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          Siparişler
        </h1>
        <p style={{ marginTop: '0.75rem', color: '#b45309' }}>
          Yeni sipariş ekranı için veritabanı geçişi henüz tamamlanmadı.
          Yedek ve baseline doğrulamasından sonra migration uygulanmalıdır.
        </p>
      </div>
    )
  }
  const addressReady = await hasAddressSchema()

  const where =
    admin.adminRole === 'SALES_REP'
      ? { customer: { salesRepId: admin.userId } }
      : undefined
  const baseSelect = {
    id: true,
    status: true,
    paymentMethod: true,
    subtotalAmount: true,
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
        discountAmount: true,
        totalAmount: true,
        currency: true,
      },
    },
    customer: {
      select: {
        name: true,
        companyCode: true,
      },
    },
  }

  // The shipping columns only exist after the address migration; selecting
  // them earlier would fail against the live database.
  const orders = addressReady
    ? await prisma.order.findMany({
        where,
        select: {
          ...baseSelect,
          shippingFullName: true,
          shippingPhone: true,
          shippingCity: true,
          shippingDistrict: true,
          shippingAddressLine: true,
          shippingPostalCode: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : (
        await prisma.order.findMany({
          where,
          select: baseSelect,
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      ).map((order) => ({
        ...order,
        shippingFullName: null,
        shippingPhone: null,
        shippingCity: null,
        shippingDistrict: null,
        shippingAddressLine: null,
        shippingPostalCode: null,
      }))

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          Siparişler
        </h1>
        <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
          En yeni 100 sipariş gösteriliyor.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={headerCellStyle}>Sipariş</th>
              <th style={headerCellStyle}>Müşteri</th>
              <th style={headerCellStyle}>Teslimat</th>
              <th style={headerCellStyle}>Kalemler</th>
              <th style={headerCellStyle}>Ödeme</th>
              <th style={{ ...headerCellStyle, textAlign: 'right' }}>Tutar</th>
              <th style={headerCellStyle}>Durum</th>
              <th style={headerCellStyle}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const statusStyle = statusStyles[order.status] ?? fallbackStatusStyle

              return (
                <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={bodyCellStyle}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td style={bodyCellStyle}>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>
                      {order.customer.name}
                    </div>
                    {order.customer.companyCode && (
                      <div style={{ marginTop: '0.25rem', color: '#64748b', fontSize: '0.8125rem' }}>
                        Cari kodu: {order.customer.companyCode}
                      </div>
                    )}
                  </td>
                  <td style={{ ...bodyCellStyle, minWidth: '180px' }}>
                    {order.shippingCity ? (
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {order.shippingFullName}
                        </div>
                        <div>
                          {order.shippingDistrict} / {order.shippingCity}
                        </div>
                        <div style={{ color: '#64748b' }}>{order.shippingPhone}</div>
                        {order.shippingAddressLine && (
                          <details>
                            <summary style={{ cursor: 'pointer', color: '#2563eb' }}>
                              Açık adres
                            </summary>
                            <p style={{ marginTop: '0.25rem', color: '#64748b' }}>
                              {order.shippingAddressLine}
                              {order.shippingPostalCode
                                ? ` (${order.shippingPostalCode})`
                                : ''}
                            </p>
                          </details>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                        Adres kaydı yok
                      </span>
                    )}
                  </td>
                  <td style={{ ...bodyCellStyle, minWidth: '260px' }}>
                    <details>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        {order.items.length > 0
                          ? `${order.items.length} kalemi göster`
                          : 'Kalem snapshot’ı yok'}
                      </summary>
                      {order.items.length > 0 ? (
                        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.625rem' }}>
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                padding: '0.625rem',
                                borderRadius: '0.5rem',
                                backgroundColor: '#f8fafc',
                                lineHeight: 1.45,
                              }}
                            >
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {item.productName}
                              </div>
                              <div style={{ marginTop: '0.2rem', color: '#64748b', fontSize: '0.8rem' }}>
                                {item.stockCode} · {item.quantity} × {item.unitName}
                                {item.unitMultiplier > 1 ? ` (${item.unitMultiplier} adet)` : ''}
                              </div>
                              <div style={{ marginTop: '0.2rem', fontWeight: 600 }}>
                                {formatMoney(item.totalAmount, item.currency)}
                                {item.discountAmount > 0 && (
                                  <span style={{ color: '#64748b', fontWeight: 400 }}>
                                    {' '}· indirim {formatMoney(item.discountAmount, item.currency)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div style={{ paddingTop: '0.25rem', textAlign: 'right', lineHeight: 1.5 }}>
                            <div>Ara toplam: {formatMoney(order.subtotalAmount, order.currency)}</div>
                            {order.discountAmount > 0 && (
                              <div>İndirim: -{formatMoney(order.discountAmount, order.currency)}</div>
                            )}
                            <div style={{ fontWeight: 700 }}>
                              Toplam: {formatMoney(order.totalAmount, order.currency)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                          Migration öncesi siparişlerde kalem verisi geriye dönük uydurulmaz.
                        </p>
                      )}
                    </details>
                  </td>
                  <td style={bodyCellStyle}>
                    {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
                  </td>
                  <td
                    style={{
                      ...bodyCellStyle,
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatMoney(order.totalAmount, order.currency)}
                  </td>
                  <td style={bodyCellStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        ...statusStyle,
                      }}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                    <OrderStatusControl
                      orderId={order.id}
                      options={statusOptionsFor(order.status, admin.adminRole)}
                    />
                  </td>
                  <td style={{ ...bodyCellStyle, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {dateFormatter.format(order.createdAt)}
                  </td>
                </tr>
              )
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  Görüntülenebilecek sipariş bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.8125rem' }}>
        Yeni siparişler değişmez ürün, birim, fiyat ve iskonto snapshot’larıyla gösterilir. Eski siparişlerde bulunmayan kalemler uydurulmaz.
      </p>
    </div>
  )
}

const headerCellStyle = {
  padding: '1rem',
  textAlign: 'left' as const,
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap' as const,
}

const bodyCellStyle = {
  padding: '1rem',
  color: '#334155',
  fontSize: '0.875rem',
  verticalAlign: 'middle' as const,
}
