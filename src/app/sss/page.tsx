'use client'

import Link from 'next/link'
import { useState } from 'react'
import { filterFaqItems } from '@/lib/faq'

export default function Page() {
  const [query, setQuery] = useState('')
  const visibleFaqItems = filterFaqItems(query)

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)', minHeight: '50vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>Sıkça Sorulan Sorular</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '800px' }}>
        Ürün arama, sipariş ve hesap işlemleri hakkında kısa yanıtlar.
      </p>
      <div style={{ maxWidth: '800px', marginTop: 'var(--spacing-xl)' }}>
        <label htmlFor="faq-search" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Sorularda ara
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-controls="faq-results"
          placeholder="Soru veya anahtar kelime"
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        />
        <p role="status" aria-live="polite" style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {visibleFaqItems.length} soru gösteriliyor
        </p>
      </div>
      <section id="faq-results" aria-label="Sıkça sorulan sorular" style={{ maxWidth: '800px', marginTop: 'var(--spacing-lg)' }}>
        {visibleFaqItems.map((item) => (
          <details
            key={item.id}
            style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem' }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.question}</summary>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.75rem', marginBottom: 0 }}>
              {item.answer}
              {item.href && item.linkText && (
                <> <Link href={item.href}>{item.linkText}</Link></>
              )}
            </p>
          </details>
        ))}
        {visibleFaqItems.length === 0 && (
          <p role="status" style={{ color: 'var(--text-secondary)' }}>
            Aramanızla eşleşen soru bulunamadı. Başka bir kelime deneyin.
          </p>
        )}
      </section>
    </div>
  )
}
