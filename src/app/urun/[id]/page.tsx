import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Image as ImageIcon } from 'lucide-react'
import { getProductById } from '@/app/actions'
import ProductDetailPurchase from '@/components/ProductDetailPurchase'
import { categoryNameToSlug } from '@/lib/category-slug'
import styles from './page.module.css'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const normalizedId = id.trim()

  if (!normalizedId || normalizedId.length > 128) {
    notFound()
  }

  const product = await getProductById(normalizedId)

  if (!product) {
    notFound()
  }

  const category = product.category
  const parentCategory = category?.parent
  const parentSlug = parentCategory ? categoryNameToSlug(parentCategory.name) : null
  const categorySlug = category ? categoryNameToSlug(category.name) : null
  const categoryHref = categorySlug
    ? parentSlug
      ? `/kategori/${parentSlug}/${categorySlug}`
      : `/kategori/${categorySlug}`
    : null

  return (
    <main className={`container ${styles.page}`}>
      <nav className={styles.breadcrumb} aria-label="Sayfa yolu">
        <Link href="/">Ana Sayfa</Link>
        <span aria-hidden="true">/</span>
        {parentCategory && parentSlug && (
          <>
            <Link href={`/kategori/${parentSlug}`}>{parentCategory.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        {category && categoryHref && (
          <>
            <Link href={categoryHref}>{category.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className={styles.currentPage}>{product.name}</span>
      </nav>

      <div className={styles.productGrid}>
        <section className={styles.imagePanel} aria-label="Ürün görseli">
          <div className={styles.imageFrame}>
            <ImageIcon size={72} className={styles.placeholder} aria-hidden="true" />
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 860px) 100vw, 52vw"
                style={{ objectFit: 'contain', padding: '2rem' }}
                loading="eager"
                unoptimized
              />
            )}
          </div>
        </section>

        <div className={styles.details}>
          <div className={styles.summary}>
            <p className={styles.stockCode}>Stok kodu: {product.stockCode}</p>
            <h1>{product.name}</h1>
            <div className={styles.stockSummary}>
              <span className={product.stockQuantity > 0 ? styles.inStock : styles.outOfStock}>
                {product.stockQuantity > 0 ? 'Stokta var' : 'Stokta yok'}
              </span>
              <span>{product.stockQuantity} adet taban stok</span>
            </div>
          </div>

          <ProductDetailPurchase
            product={{
              id: product.id,
              stockCode: product.stockCode,
              name: product.name,
              imageUrl: product.imageUrl,
              stockQuantity: product.stockQuantity,
              units: product.units,
              prices: product.prices,
            }}
          />
        </div>
      </div>

      <section className={styles.description} aria-labelledby="description-title">
        <h2 id="description-title">Ürün açıklaması</h2>
        <p>
          {product.description?.trim() || 'Bu ürün için henüz ayrıntılı açıklama eklenmemiş.'}
        </p>
      </section>
    </main>
  )
}
