import { prisma } from '@/lib/prisma'
import { parseCustomerStatus } from '@/lib/customer-status'
import type { CustomerStatus } from '@/lib/customer-status'

type CapabilityRow = {
  hasCustomerStatus: number
}

type OrderCapabilityRow = {
  hasOrderIntegrity: number
}

type AddressCapabilityRow = {
  hasAddressSchema: number
}

type CustomerStatusRow = {
  status: string
}

export async function hasCustomerApprovalSchema(): Promise<boolean> {
  const rows = await prisma.$queryRaw<CapabilityRow[]>`
    SELECT CAST(
      CASE
        WHEN COL_LENGTH(N'dbo.Customer', N'status') IS NULL THEN 0
        ELSE 1
      END
      AS INT
    ) AS [hasCustomerStatus]
  `

  return Number(rows[0]?.hasCustomerStatus ?? 0) === 1
}

export async function hasOrderIntegritySchema(): Promise<boolean> {
  const rows = await prisma.$queryRaw<OrderCapabilityRow[]>`
    SELECT CAST(
      CASE
        WHEN COL_LENGTH(N'dbo.Customer', N'status') IS NOT NULL
         AND COL_LENGTH(N'dbo.[Order]', N'idempotencyKey') IS NOT NULL
         AND OBJECT_ID(N'dbo.OrderItem', N'U') IS NOT NULL
        THEN 1
        ELSE 0
      END
      AS INT
    ) AS [hasOrderIntegrity]
  `

  return Number(rows[0]?.hasOrderIntegrity ?? 0) === 1
}

export async function hasAddressSchema(): Promise<boolean> {
  const rows = await prisma.$queryRaw<AddressCapabilityRow[]>`
    SELECT CAST(
      CASE
        WHEN OBJECT_ID(N'dbo.Address', N'U') IS NOT NULL
         AND COL_LENGTH(N'dbo.[Order]', N'shippingCity') IS NOT NULL
        THEN 1
        ELSE 0
      END
      AS INT
    ) AS [hasAddressSchema]
  `

  return Number(rows[0]?.hasAddressSchema ?? 0) === 1
}

export async function getCustomerStatusForAuth(
  customerId: string
): Promise<CustomerStatus | null> {
  if (!(await hasCustomerApprovalSchema())) {
    // The reviewed incremental migration intentionally backfills every customer
    // that predates the approval workflow as ACTIVE. Mirror only that legacy
    // behavior until the migration cutover; new registrations stay disabled.
    return 'ACTIVE'
  }

  const rows = await prisma.$queryRaw<CustomerStatusRow[]>`
    SELECT TOP (1) [status]
    FROM [dbo].[Customer]
    WHERE [id] = ${customerId}
  `

  return parseCustomerStatus(rows[0]?.status)
}
