# Address and shipping snapshot migration

Adds the customer `Address` table and nullable shipping snapshot columns on
`Order`.

## Ordering

Must be applied after `20260715000000_order_integrity_incremental`. The script
verifies this with a `COL_LENGTH` guard on `Order.idempotencyKey` and aborts
otherwise.

## Legacy data

Existing orders keep `NULL` shipping columns; the UI shows "adres kaydı yok"
for them instead of inventing an address. New orders created after the
application cutover write an immutable snapshot of the selected address into
the order row, so later address edits do not rewrite order history.

## Application behavior before cutover

`hasAddressSchema()` in `src/lib/customer-schema-compat.ts` detects whether
this migration has been applied. Before cutover the checkout works without an
address (current behavior); after cutover an address becomes mandatory for new
orders.
