import { getProducts } from './actions'
import { prisma } from '@/lib/prisma'
import HeroSlider from '@/components/HeroSlider'
import HomeSections from '@/components/HomeSections'

export default async function Home() {
  const products = await getProducts()
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  })

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <HeroSlider banners={banners} />
      <HomeSections products={products} />
    </div>
  )
}
