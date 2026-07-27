import assert from 'node:assert/strict'
import test from 'node:test'

import {
  redactProductPrices,
  redactProductsPrices,
} from '../src/lib/catalog-price-access'

test('dealer prices are removed without mutating the source product', () => {
  const source = {
    id: 'product-1',
    name: 'Bayi ürünü',
    prices: [{ id: 'price-1', price: 125, currency: 'TRY' }],
  }

  const redacted = redactProductPrices(source)

  assert.deepEqual(redacted.prices, [])
  assert.equal(redacted.id, source.id)
  assert.equal(source.prices.length, 1)
  assert.notEqual(redacted, source)
})

test('dealer prices are removed from every product in a collection', () => {
  const products = [
    { id: 'one', prices: [{ price: 10 }] },
    { id: 'two', prices: [{ price: 20 }] },
  ]

  assert.deepEqual(
    redactProductsPrices(products).map((product) => product.prices),
    [[], []]
  )
})
