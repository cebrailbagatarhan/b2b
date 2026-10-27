import assert from 'node:assert/strict'
import test from 'node:test'
import { parseQuickOrderPaste, MAX_QUICK_ORDER_ROWS } from '../src/lib/quick-order-paste.ts'

test('imports Excel tab rows with optional header and BOM', () => {
  assert.deepEqual(parseQuickOrderPaste('\uFEFFStok Kodu\tAdet\r\nSTK-1\t2\r\nSTK-2\t3\n'), {
    rows: [{ stockCode: 'STK-1', quantity: 2 }, { stockCode: 'STK-2', quantity: 3 }],
    errors: [],
  })
})

test('supports semicolon rows and ignores blanks', () => {
  assert.deepEqual(parseQuickOrderPaste('\n Stok Kodu;Miktar\n\n ÜRÜN-1 ; 10 \n').rows, [
    { stockCode: 'ÜRÜN-1', quantity: 10 },
  ])
})

test('rejects fractional, zero, negative and excessive quantities', () => {
  for (const quantity of ['0', '-1', '2.5', '1e2', '10000']) {
    const result = parseQuickOrderPaste('SKU;' + quantity)
    assert.equal(result.rows.length, 0)
    assert.equal(result.errors.length, 1)
  }
})

test('rejects duplicate stock codes ignoring Turkish case', () => {
  const result = parseQuickOrderPaste('İST-1;1\nist-1;2')
  assert.equal(result.rows.length, 1)
  assert.match(result.errors[0], /Tekrarlanan/)
})

test('rejects malformed lines and empty input', () => {
  assert.equal(parseQuickOrderPaste('A,B').errors.length, 1)
  assert.equal(parseQuickOrderPaste(' \n ').errors.length, 1)
  assert.equal(parseQuickOrderPaste('X;1;extra').errors.length, 1)
})

test('enforces a maximum of 100 rows', () => {
  const text = Array.from({ length: MAX_QUICK_ORDER_ROWS + 1 }, (_, i) => 'S-' + i + ';1').join('\n')
  const result = parseQuickOrderPaste(text)
  assert.equal(result.rows.length, MAX_QUICK_ORDER_ROWS)
  assert.equal(result.errors.length, 1)
})
