import { getCategoryBySlug } from '@/app/actions'
import CategoryView from '@/components/CategoryView'
import { categoryNameToSlug } from '@/lib/category-slug'
import { notFound } from 'next/navigation'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const categorySlug = categoryNameToSlug(category.name)

  return (
    <CategoryView
      categoryName={category.name}
      categorySlug={categorySlug}
      products={category.products}
      subcategories={category.children}
    />
  )
}
