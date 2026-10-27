export type FaqItem = {
  id: string
  question: string
  answer: string
  href?: string
  linkText?: string
}

// Keep answers aligned with the actual routes and currently enabled checkout flows.
export const faqItems: readonly FaqItem[] = [
  {
    id: 'urun-arama',
    question: 'Ürünleri nasıl bulabilirim?',
    answer: 'Ürün aramasını kullanabilir veya kategorilere göz atabilirsiniz.',
    href: '/kategoriler',
    linkText: 'Kategorileri görüntüle',
  },
  {
    id: 'siparis-takip',
    question: 'Siparişlerimi nereden takip edebilirim?',
    answer: 'Oturum açtıktan sonra hesabınızdan siparişlerinizi görüntüleyebilirsiniz.',
    href: '/hesabim',
    linkText: 'Hesabım',
  },
  {
    id: 'odeme-yontemleri',
    question: 'Hangi ödeme yöntemleri kullanılabilir?',
    answer: 'Şu anda yalnız yetkili B2B müşterileri cari hesap üzerinden sipariş oluşturabilir. Kredi kartı ve Havale/EFT ödeme seçenekleri henüz kullanıma açık değildir.',
  },
  {
    id: 'sifre-sifirlama',
    question: 'Şifremi unuttum, ne yapmalıyım?',
    answer: 'Şifre sıfırlama talebini ilgili sayfadan başlatabilirsiniz.',
    href: '/sifremi-unuttum',
    linkText: 'Şifremi unuttum',
  },
]
