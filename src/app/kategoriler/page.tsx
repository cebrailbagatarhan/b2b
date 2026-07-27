import { getCategories } from '@/app/actions'
import CategoriesList from '@/components/CategoriesList'

export default async function CategoriesPage() {
  const categories = await getCategories()
  return <CategoriesList categories={categories} />
}
