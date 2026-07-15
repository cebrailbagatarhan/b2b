export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)', minHeight: '50vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>Sıkça Sorulan Sorular</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '800px' }}>
        Sistem kullanımı, sipariş oluşturma ve ödeme süreçleriyle ilgili sıkça sorulan sorular.
      </p>
    </div>
  );
}
