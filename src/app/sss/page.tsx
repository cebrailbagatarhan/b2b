import Link from 'next/link'
import { faqItems } from '@/lib/faq'

export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)', minHeight: '50vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>Sıkça Sorulan Sorular</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '800px' }}>
        Ürün arama, sipariş ve hesap işlemleri hakkında kısa yanıtlar.
      </p>
      <section aria-label="Sıkça sorulan sorular" style={{ maxWidth: '800px', marginTop: 'var(--spacing-xl)' }}>
        {faqItems.map((item) => (
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
      </section>
    </div>
  )
}
