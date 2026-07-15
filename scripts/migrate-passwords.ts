import { PrismaClient } from '@prisma/client'
import { hashPassword, isHashedPassword } from '../src/lib/password'

const prisma = new PrismaClient()
const KNOWN_WEAK_PASSWORDS = new Set([
  'admin',
  'demo123',
  'password',
  '12345678',
])

type AccountToMigrate = {
  id: string
  email: string
  password: string
  kind: 'admin' | 'customer'
}

function readRotations(): Record<string, string> {
  const raw = process.env.PASSWORD_ROTATIONS_JSON?.trim()
  if (!raw) return {}

  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('PASSWORD_ROTATIONS_JSON bir e-posta/parola nesnesi olmalıdır.')
  }

  const rotations: Record<string, string> = {}
  for (const [email, password] of Object.entries(parsed)) {
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error(`${email} için yeni parola en az 12 karakter olmalıdır.`)
    }
    rotations[email.trim().toLowerCase()] = password
  }

  return rotations
}

async function main() {
  if (process.env.CONFIRM_PASSWORD_MIGRATION !== 'YES') {
    throw new Error(
      'Çalıştırmak için CONFIRM_PASSWORD_MIGRATION=YES ayarlayın. Önce veritabanı yedeği alın.'
    )
  }

  const rotations = readRotations()
  const [admins, customers] = await Promise.all([
    prisma.admin.findMany({
      select: { id: true, email: true, password: true },
    }),
    prisma.customer.findMany({
      select: { id: true, email: true, password: true },
    }),
  ])
  const accounts: AccountToMigrate[] = [
    ...admins.map((account) => ({ ...account, kind: 'admin' as const })),
    ...customers.map((account) => ({ ...account, kind: 'customer' as const })),
  ].filter((account) => !isHashedPassword(account.password))

  const unresolvedWeakAccounts = accounts.filter((account) => {
    const hasRotation = Boolean(rotations[account.email.trim().toLowerCase()])
    return KNOWN_WEAK_PASSWORDS.has(account.password.toLowerCase()) && !hasRotation
  })

  if (unresolvedWeakAccounts.length > 0) {
    throw new Error(
      `Bilinen zayıf parolalar döndürülmeden işlem yapılmadı: ${unresolvedWeakAccounts
        .map((account) => account.email)
        .join(', ')}. PASSWORD_ROTATIONS_JSON ile yeni parola sağlayın.`
    )
  }

  const updates = [] as Array<{
    id: string
    kind: AccountToMigrate['kind']
    password: string
  }>

  for (const account of accounts) {
    const replacement = rotations[account.email.trim().toLowerCase()]
    updates.push({
      id: account.id,
      kind: account.kind,
      password: await hashPassword(replacement ?? account.password),
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      if (update.kind === 'admin') {
        await tx.admin.update({
          where: { id: update.id },
          data: { password: update.password },
        })
      } else {
        await tx.customer.update({
          where: { id: update.id },
          data: { password: update.password },
        })
      }
    }
  })

  console.log(
    `Parola geçişi tamamlandı. Admin: ${updates.filter((item) => item.kind === 'admin').length}, müşteri: ${updates.filter((item) => item.kind === 'customer').length}`
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
