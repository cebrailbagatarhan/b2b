# Prisma migration baseline requirement

The repository originally contained a populated SQL Server schema but no `prisma/migrations` history. The migration named `20260715000000_order_integrity_incremental` therefore describes only the delta from that existing schema. It cannot create a fresh database by itself and must not be run with `prisma migrate deploy` until a reviewed baseline migration exists before it.

No database command was run while preparing these files.

## Required baseline procedure

1. Take and verify a restorable database backup.
2. Capture the exact Prisma schema revision that matches the deployed database immediately before the order-integrity changes. Do not use the new schema as the pre-change baseline source.
3. Generate a full baseline SQL script from that pre-change schema in a separate working copy and place it in an earlier migration directory, for example `prisma/migrations/20260714000000_baseline/migration.sql`.
4. Review that SQL against the real SQL Server catalog, including native types, default constraints, foreign keys, indexes, and table names. Test replay from empty on a disposable SQL Server database.
5. On the populated database only, record the reviewed baseline as already applied with Prisma's `migrate resolve --applied` workflow. This step changes migration metadata and requires an operator-approved maintenance plan.
6. Run the preflight queries below and deploy application code compatible with the new required fields.
7. Apply `20260715000000_order_integrity_incremental` in a maintenance window, then verify row counts, constraints, order creation/retry behavior, approval enforcement, stock, and balances.
8. Verify a completely fresh database can replay the reviewed baseline followed by every incremental migration.

Do not invent a baseline from assumptions and do not mark this incremental migration as applied without actually applying and validating its schema changes.

## Read-only preflight queries

```sql
SELECT [productId], [customerId], COUNT_BIG(*) AS [duplicateCount]
FROM [dbo].[Waitlist]
GROUP BY [productId], [customerId]
HAVING COUNT_BIG(*) > 1;

SELECT [id], LEN(CONVERT(NVARCHAR(MAX), [id])) AS [idLength]
FROM [dbo].[Order]
WHERE LEN(CONVERT(NVARCHAR(MAX), [id])) > 121;

SELECT
    OBJECT_ID(N'[dbo].[Customer]', N'U') AS [CustomerTable],
    OBJECT_ID(N'[dbo].[Order]', N'U') AS [OrderTable],
    OBJECT_ID(N'[dbo].[Product]', N'U') AS [ProductTable],
    OBJECT_ID(N'[dbo].[ProductUnit]', N'U') AS [ProductUnitTable],
    OBJECT_ID(N'[dbo].[Waitlist]', N'U') AS [WaitlistTable];
```

## Backout boundary

The SQL migration is transactional and uses `XACT_ABORT`; an error before commit rolls back its changes. After successful deployment and new order-item writes, a schema rollback would be destructive. Restore from backup or use a separately reviewed forward-fix migration rather than dropping snapshot data ad hoc.
