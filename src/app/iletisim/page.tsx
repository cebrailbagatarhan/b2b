export default function Page() {
  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)', minHeight: '50vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>İletişim</h1>
      <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '800px' }}>
        Bizimle iletişime geçmek için destek@toptanmarket.com adresine e-posta gönderebilir veya 0850 123 45 67 numaralı telefonu arayabilirsiniz.
      </p>
    </div>
  );
}
