import { Suspense } from 'react'
import ResetPasswordForm from '@/app/sifre-sifirla/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '3rem' }}>Yükleniyor…</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
