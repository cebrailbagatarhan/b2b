import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

function requireSeedPassword(name: 'SEED_ADMIN_PASSWORD' | 'SEED_CUSTOMER_PASSWORD') {
  const password = process.env[name]
  const blockedPasswords = new Set(['admin', 'demo123', 'password', '12345678'])

  if (
    !password ||
    password.length < 12 ||
    blockedPasswords.has(password.toLowerCase())
  ) {
    throw new Error(`${name} en az 12 karakterli ve benzersiz olmalıdır.`)
  }

  return password
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed üretim ortamında çalıştırılamaz.')
  }

  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Bu seed tüm mevcut veriyi siler. Yerelde çalıştırmak için ALLOW_DEMO_SEED=true ayarlayın.'
    )
  }

  const [adminPassword, customerPassword] = await Promise.all([
    hashPassword(requireSeedPassword('SEED_ADMIN_PASSWORD')),
    hashPassword(requireSeedPassword('SEED_CUSTOMER_PASSWORD')),
  ])

  // Clean existing data in correct FK order
  await prisma.waitlist.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.order.deleteMany()
  await prisma.productPrice.deleteMany()
  await prisma.productUnit.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.banner.deleteMany()

  // ─── Categories ───
  const hirdavat = await prisma.category.create({ data: { name: 'Hırdavat' } })
  const oyuncak = await prisma.category.create({ data: { name: 'Oyuncak' } })
  const kirtasiye = await prisma.category.create({ data: { name: 'Kırtasiye' } })
  const zuccaciye = await prisma.category.create({ data: { name: 'Züccaciye' } })
  const kozmetik = await prisma.category.create({ data: { name: 'Kozmetik' } })
  const tekstil = await prisma.category.create({ data: { name: 'Tekstil' } })

  // Sub-categories
  await prisma.category.create({
    data: { name: 'Bahçe Ekipmanları', parentId: hirdavat.id },
  })
  const egitici = await prisma.category.create({
    data: { name: 'Eğitici Oyuncaklar', parentId: oyuncak.id },
  })
  const mutfak = await prisma.category.create({
    data: { name: 'Mutfak Gereçleri', parentId: zuccaciye.id },
  })

  // ─── Admin User ───
  await prisma.admin.create({
    data: {
      name: 'Firma Sahibi',
      email: 'admin@toptan.com',
      password: adminPassword,
    },
  })

  // ─── Demo Customer ───
  await prisma.customer.create({
    data: {
      name: 'Demo Müşteri A.Ş.',
      email: 'musteri@demo.com',
      password: customerPassword,
      status: 'ACTIVE',
      companyCode: 'MUSTERI-001',
      taxId: '1234567890',
      balance: 25000.0,
    },
  })

  // ─── Demo Banner ───
  await prisma.banner.create({
    data: {
      title: 'İlkbahar İndirimleri Başladı',
      subtitle: 'Tüm kırtasiye ürünlerinde net %20 indirim fırsatını kaçırmayın.',
      imageUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      linkUrl: '/kategori/kirtasiye',
    }
  })

  // ─── Products ───
  const products = [
    {
      name: 'RUBENIS CHERRY BAYAN ŞEMSİYE 8 TELLİ',
      stockCode: '06540055',
      description: 'Kaliteli 8 telli bayan şemsiyesi, otomatik açılır kapanır mekanizma.',
      categoryId: hirdavat.id,
      price: 150.0,
      stockQuantity: 120,
      minStockLevel: 20,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Koli', multiplier: 50 },
      ],
    },
    {
      name: 'MARPAS 50 ÇOCUK ŞEMSİYE',
      stockCode: '06540044',
      description: 'Çocuklar için renkli desenli şemsiye, dayanıklı yapı.',
      categoryId: hirdavat.id,
      price: 85.0,
      stockQuantity: 96,
      minStockLevel: 18,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Kutu', multiplier: 12 },
      ],
    },
    {
      name: 'FABER CASTELL 12\'Lİ KURU BOYA',
      stockCode: '11200412',
      description: 'Faber Castell kalitesiyle 12 renk kuru boya kalemi seti.',
      categoryId: kirtasiye.id,
      price: 45.0,
      stockQuantity: 240,
      minStockLevel: 36,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Düzine', multiplier: 12 },
      ],
    },
    {
      name: 'LEGO CLASSIC YARATICI KUTU 484 PCS',
      stockCode: '30100484',
      description: 'Lego Classic 484 parça yaratıcı kutu, 4+ yaş.',
      categoryId: egitici.id,
      price: 650.0,
      stockQuantity: 30,
      minStockLevel: 6,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Koli', multiplier: 6 },
      ],
    },
    {
      name: 'EMSAN AHENK ÇAY TAKIMI 18/10 PASLANMAZ',
      stockCode: '45200018',
      description: '18/10 paslanmaz çelik çay takımı, 6 kişilik.',
      categoryId: zuccaciye.id,
      price: 1250.0,
      stockQuantity: 24,
      minStockLevel: 4,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Koli', multiplier: 4 },
      ],
    },
    {
      name: 'PAŞABAHÇE 6\'LI SU BARDAĞI',
      stockCode: '45100206',
      description: 'Paşabahçe kalitesi ile 6\'lı cam su bardağı seti.',
      categoryId: mutfak.id,
      price: 95.0,
      stockQuantity: 144,
      minStockLevel: 24,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Koli', multiplier: 24 },
      ],
    },
    {
      name: 'FARMASI BB KREM 50ML',
      stockCode: '60100050',
      description: 'Doğal içerikli BB krem, tüm cilt tipleri için uygun.',
      categoryId: kozmetik.id,
      price: 120.0,
      stockQuantity: 180,
      minStockLevel: 36,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Koli', multiplier: 36 },
      ],
    },
    {
      name: 'EVCİL PAMUKLU HAVLU 50x90',
      stockCode: '70200590',
      description: '%100 pamuklu el havlusu, 50x90 cm, çeşitli renkler.',
      categoryId: tekstil.id,
      price: 75.0,
      stockQuantity: 120,
      minStockLevel: 24,
      units: [
        { unitName: 'Adet', multiplier: 1 },
        { unitName: 'Düzine', multiplier: 12 },
      ],
    },
  ]

  for (const p of products) {
    await prisma.product.create({
      data: {
        name: p.name,
        stockCode: p.stockCode,
        description: p.description,
        categoryId: p.categoryId,
        stockQuantity: p.stockQuantity,
        minStockLevel: p.minStockLevel,
        prices: {
          create: [{ price: p.price, currency: 'TRY' }],
        },
        units: {
          create: p.units,
        },
      },
    })
  }

  console.log('Seed completed successfully! Admin, Customer, Banner and Products created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
