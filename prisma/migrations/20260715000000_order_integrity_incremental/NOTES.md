# Order integrity migration notes

This migration has intentionally not been executed against any database.

## Historical data assumptions

- Existing `Customer` rows are treated as previously approved and are backfilled as `ACTIVE`.
- New customers default to `PENDING_APPROVAL`. Application authorization must reject ordering and other privileged customer operations until the status is `ACTIVE`.
- Existing customer risk-limit values are preserved. Only the database default for future customers changes from the legacy 500,000 TRY value to `0`; an administrator must explicitly grant open-account capacity during approval.
- Existing order IDs are assumed to be ASCII CUID values no longer than 121 characters. Their deterministic key is `legacy:<order-id>`.
- Old orders have no line-level data. The migration does not invent `OrderItem` records.
- Old orders also do not expose their original pre-discount subtotal. For these rows, `subtotalAmount = totalAmount`, `discountRate = 0`, and `discountAmount = 0` preserves the recorded financial total without fabricating an unknown discount.
- Existing order currency is assumed to be `TRY` because the previous schema had no currency column.

The SQL aborts without committing if duplicate `(productId, customerId)` waitlist pairs exist. This preserves data and requires an operator to decide which duplicate records should survive.

## Application cutover requirements

Before applying the migration, deploy-ready application code must:

1. Generate or accept a stable idempotency key for every order request and retry with the same key.
2. Persist the `Order` header and all immutable `OrderItem` snapshots in the same transaction as stock and balance changes.
3. Return the already-created order for a repeated `(customerId, idempotencyKey)` request instead of surfacing a generic unique-index error.
4. Populate snapshot fields from server-read product, unit, price, discount, and currency data; never from client totals.
5. Check `Customer.status = ACTIVE` before allowing customer login/order operations, according to the product policy.
6. Seed the intentional demo customer with `status: "ACTIVE"`; otherwise the new schema default makes it pending approval.

## Why Float to Decimal is deferred

Changing live monetary columns from `FLOAT(53)` directly to `DECIMAL` can round historical values, lock large tables, and break a concurrently deployed Prisma Client. This migration keeps the current types to isolate the structural change.

Use a separate, reviewed migration for monetary precision. A safer rollout is:

1. Add parallel `DECIMAL(19,4)` amount columns and an appropriately scaled decimal rate column.
2. Backfill with explicit rounding rules and compare every converted value to its source.
3. Deploy code that reads/writes the decimal columns.
4. Reconcile financial totals, then remove or rename the float columns in a later maintenance window.

The same conversion plan must cover at least customer balance/risk/discount, product price, order header amounts, and order-item snapshot amounts.

## SQL Server index-width warning

The existing schema maps identifier strings to `NVARCHAR(1000)`. SQL Server may warn that the declared maximum size of composite indexes exceeds its nonclustered key limit even though real CUID values are short. Validate the migration with production-shaped data. A later identifier-normalization migration should constrain all related ID columns together; do not resize only one side of a foreign key.
