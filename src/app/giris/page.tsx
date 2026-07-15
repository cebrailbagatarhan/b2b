import { redirect } from 'next/navigation'
import LoginForm from '@/app/giris/LoginForm'
import { requireVerifiedSession } from '@/lib/authorization'
import { getAuthenticatedHomePath } from '@/lib/auth-navigation'
import { AuthorizationError } from '@/lib/session'

export default async function LoginPage() {
  let destination: string | null = null

  try {
    const session = await requireVerifiedSession()
    destination = getAuthenticatedHomePath(session)
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error
  }

  if (destination) redirect(destination)

  return <LoginForm />
}
