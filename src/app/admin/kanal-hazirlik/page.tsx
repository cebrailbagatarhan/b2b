import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/authorization'
import {
  COMMERCE_CHANNELS,
  COMMERCE_READINESS_BLOCKER_CHANNELS,
  COMMERCE_READINESS_BLOCKER_LABELS,
  UNMODELED_CHANNEL_BLOCKER_CODES,
} from '@/lib/commerce-readiness'
import { getCommerceReadinessSnapshot } from '@/lib/commerce-readiness-data'
import { AuthorizationError } from '@/lib/session'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

const ANALYSIS_LIMIT = 1_000
const TABLE_LIMIT = 100

export default async function ChannelReadinessPage() {
  try {
    await requireAdmin(['SUPERADMIN', 'WAREHOUSE'])
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect(error.status === 401 ? '/giris' : '/admin')
    }
    throw error
  }

  const snapshot = await getCommerceReadinessSnapshot(ANALYSIS_LIMIT)
  const displayedResults = snapshot.results.slice(0, TABLE_LIMIT)

  return (
    <main className={styles.page}>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Katalog denetimi</p>
          <h1>Kanal Hazırlık Merkezi</h1>
          <p className={styles.subtitle}>
            Mevcut ürün verilerini B2B, B2C ve pazaryeri kanallarına hazırlık açısından
            kontrol eder.
          </p>
        </div>
        <a className={styles.exportButton} href="/api/admin/catalog-readiness">
          Tüm kataloğu CSV indir
        </a>
      </div>

      <section className={styles.warning} aria-labelledby="scope-warning-title">
        <h2 id="scope-warning-title">Bu ekran doğrudan Trendyol yüklemesi yapmaz</h2>
        <p>
          Herhangi bir pazaryerine veri gönderilmez ve ürün değiştirilmez. Ekran yalnız
          ilk {ANALYSIS_LIMIT.toLocaleString('tr-TR')} ürünü analiz eder; CSV dışa aktarımı
          ise tüm ürünleri küçük veritabanı partileriyle tarar. Sonuç yalnız katalog
          verisi hazırlığını gösterir; ödeme, kargo, fatura ve kanal bağlantısının
          üretime hazır olduğu anlamına gelmez.
        </p>
      </section>

      <section className={styles.cards} aria-label="Hazırlık özeti">
        <article className={styles.card}>
          <span>Katalog toplamı</span>
          <strong>{snapshot.totalCatalogCount.toLocaleString('tr-TR')}</strong>
        </article>
        <article className={styles.card}>
          <span>Analiz edilen</span>
          <strong>{snapshot.summary.analyzedCount.toLocaleString('tr-TR')}</strong>
        </article>
        <article className={styles.card}>
          <span>B2B hazır</span>
          <strong>{snapshot.summary.readyByChannel.B2B.toLocaleString('tr-TR')}</strong>
        </article>
        <article className={styles.card}>
          <span>B2C hazır</span>
          <strong>{snapshot.summary.readyByChannel.B2C.toLocaleString('tr-TR')}</strong>
        </article>
        <article className={styles.card}>
          <span>Pazaryeri hazır</span>
          <strong>
            {snapshot.summary.readyByChannel.MARKETPLACE.toLocaleString('tr-TR')}
          </strong>
        </article>
      </section>

      {snapshot.truncated && (
        <p className={styles.limitNotice}>
          Özet ilk {snapshot.summary.analyzedCount.toLocaleString('tr-TR')} ürün içindir.
          Kalan ürünler tüm katalog CSV raporuna dahildir.
        </p>
      )}

      <section className={styles.section}>
        <h2>Şema nedeniyle ilgili kanalı engelleyen alanlar</h2>
        <p>
          Aşağıdaki bilgiler mevcut veritabanı modelinde bulunmadığı için tahmin edilmez.
          Migration ve iş kararı tamamlanana kadar ürünler kanala hazır sayılmaz.
        </p>
        <ul className={styles.blockerGrid}>
          {UNMODELED_CHANNEL_BLOCKER_CODES.map((code) => (
            <li key={code}>
              <code>{code}</code>
              <span>{COMMERCE_READINESS_BLOCKER_LABELS[code]}</span>
              <small>
                Etkilenen: {COMMERCE_READINESS_BLOCKER_CHANNELS[code].join(', ')}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Engelleyici dağılımı</h2>
        {snapshot.summary.blockerCounts.length > 0 ? (
          <div className={styles.countList}>
            {snapshot.summary.blockerCounts.map((item) => (
              <div key={item.code} className={styles.countRow}>
                <div>
                  <code>{item.code}</code>
                  <span>{item.label}</span>
                </div>
                <strong>{item.count.toLocaleString('tr-TR')}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>Analiz edilecek ürün bulunamadı.</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.tableHeading}>
          <div>
            <h2>Ürün bazlı sonuçlar</h2>
            <p>
              Sayfayı hafif tutmak için analiz edilen ürünlerin ilk{' '}
              {Math.min(TABLE_LIMIT, displayedResults.length).toLocaleString('tr-TR')} kaydı
              gösterilir. Tam sonuç CSV dosyasındadır.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Stok kodu</th>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>Durum</th>
                <th>Engelleyiciler</th>
              </tr>
            </thead>
            <tbody>
              {displayedResults.map((result) => (
                <tr key={result.product.id}>
                  <td><code>{result.product.stockCode || '—'}</code></td>
                  <td>{result.product.name || 'Adsız ürün'}</td>
                  <td>{result.product.category?.name ?? '—'}</td>
                  <td>
                    <div className={styles.channelStatuses}>
                      {COMMERCE_CHANNELS.map((channel) => (
                        <span
                          key={channel}
                          className={
                            result.readyByChannel[channel]
                              ? styles.ready
                              : styles.blocked
                          }
                        >
                          {channel}: {result.readyByChannel[channel] ? 'Hazır' : 'Engelli'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <details>
                      <summary>{result.blockers.length} engelleyici</summary>
                      <ul className={styles.rowBlockers}>
                        {result.blockers.map((item) => (
                          <li key={item.code}>
                            <code>{item.code}</code> — {item.label}{' '}
                            <small>({item.channels.join(', ')})</small>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              ))}
              {displayedResults.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>Katalogda ürün bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
