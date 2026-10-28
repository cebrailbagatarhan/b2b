import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import type { faqItems as FaqItems, filterFaqItems as FilterFaqItems } from '../src/lib/faq.ts'

// Node's strip-types runner needs the explicit .ts extension, which tsc rejects in
// value imports unless allowImportingTsExtensions is enabled, so load it dynamically.
const { faqItems, filterFaqItems } = (await import(new URL('../src/lib/faq.ts', import.meta.url).href)) as {
  faqItems: typeof FaqItems
  filterFaqItems: typeof FilterFaqItems
}

test('FAQ entries have unique stable IDs and meaningful Turkish copy', () => {
  assert.ok(faqItems.length >= 4)
  assert.equal(new Set(faqItems.map((item) => item.id)).size, faqItems.length)
  for (const item of faqItems) {
    assert.match(item.id, /^[a-z0-9-]+$/)
    assert.ok(item.question.trim().length > 10)
    assert.ok(item.answer.trim().length > 20)
  }
})

test('FAQ links stay internal and have visible labels', () => {
  for (const item of faqItems) {
    assert.equal(Boolean(item.href), Boolean(item.linkText))
    if (item.href) {
      assert.match(item.href, /^\/[a-z0-9/-]+$/)
      assert.ok(!item.href.startsWith('//'))
    }
  }
})

test('payment answer does not advertise disabled payment methods', () => {
  const answer = faqItems.find((item) => item.id === 'odeme-yontemleri')?.answer
  assert.ok(answer)
  assert.match(answer, /cari hesap/i)
  assert.match(answer, /kredi kartı.*Havale\/EFT.*açık değildir/i)
})

test('FAQ page uses native keyboard-accessible disclosure and mapped answers', async () => {
  const page = await readFile(new URL('../src/app/sss/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /visibleFaqItems\.map\(/)
  assert.match(page, /<details\b/)
  assert.match(page, /<summary\b/)
  assert.match(page, /\{item\.answer\}/)
  assert.match(page, /<Link href=\{item\.href\}>/)
})

test('FAQ search is Turkish-case-aware, whitespace-tolerant and matches answers', () => {
  assert.deepEqual(filterFaqItems('  ŞİFRE  ').map((item) => item.id), ['sifre-sifirlama'])
  assert.deepEqual(filterFaqItems('KREDİ KARTI').map((item) => item.id), ['odeme-yontemleri'])
  assert.deepEqual(filterFaqItems('sipariş hesap').map((item) => item.id), ['siparis-takip'])
  assert.equal(filterFaqItems('bulunmayan-terim').length, 0)
  assert.equal(filterFaqItems('   ').length, faqItems.length)
  assert.equal(filterFaqItems('').length, faqItems.length)
})

test('FAQ search page provides a labeled search field, live result count and empty state', async () => {
  const page = await readFile(new URL('../src/app/sss/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /type="search"/)
  assert.match(page, /htmlFor="faq-search"/)
  assert.match(page, /aria-controls="faq-results"/)
  assert.match(page, /aria-live="polite"/)
  assert.match(page, /visibleFaqItems\.length === 0/)
  assert.match(page, /filterFaqItems\(query\)/)
})
