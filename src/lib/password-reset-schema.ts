import { prisma } from '@/lib/prisma'

let cached: boolean | null = null
let cachedAt = 0
const TTL_MS = 60_000

/** True when PasswordResetToken table exists (migration applied). */
export async function hasPasswordResetTokenSchema(): Promise<boolean> {
  const now = Date.now()
  if (cached !== null && now - cachedAt < TTL_MS) return cached

  try {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT CASE
        WHEN OBJECT_ID(N'[dbo].[PasswordResetToken]', N'U') IS NULL THEN 0
        ELSE 1
      END AS ok
    `
    cached = Number(rows[0]?.ok) === 1
  } catch {
    cached = false
  }

  cachedAt = now
  return cached
}
