import { getChildCategoryBySlugs } from '@/app/actions'
import CategoryView from '@/components/CategoryView'
import { categoryNameToSlug } from '@/lib/category-slug'
import { notFound } from 'next/navigation'

export default async function ChildCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; childSlug: string }>
}) {
  const { slug, childSlug } = await params
  const category = await getChildCategoryBySlugs(slug, childSlug)

  if (!category) {
    notFound()
  }

  return (
    <CategoryView
      categoryName={category.name}
      categorySlug={categoryNameToSlug(category.name)}
      products={category.products}
      parent={{
        name: category.parent.name,
        slug: categoryNameToSlug(category.parent.name),
      }}
    />
  )
}
