'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { cancelOwnUnpaidOrder } from '@/app/actions'

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleCancel = async () => {
    if (
      pending ||
      !window.confirm(
        'Bu ödeme bekleyen siparişi iptal etmek ve ayrılan stoğu geri bırakmak istiyor musunuz?'
      )
    ) {
      return
    }

    setPending(true)
    try {
      const result = await cancelOwnUnpaidOrder(orderId)
      if (!result.success) {
        window.alert(result.error)
        return
      }
      router.refresh()
    } catch {
      window.alert('Sipariş iptal edilemedi. Lütfen tekrar deneyin.')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={pending}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        marginTop: 'var(--spacing-md)',
        padding: '0.6rem 0.85rem',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#fff7f7',
        color: '#b91c1c',
        cursor: pending ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        opacity: pending ? 0.65 : 1,
      }}
    >
      <XCircle size={17} />
      {pending ? 'İptal ediliyor…' : 'Siparişi iptal et'}
    </button>
  )
}
