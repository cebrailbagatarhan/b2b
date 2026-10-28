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

/** Search questions and answers with Turkish-aware casing; all terms must match. */
export function filterFaqItems(query: string): readonly FaqItem[] {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
  const terms = normalize(query).split(' ').filter(Boolean)
  if (!terms.length) return faqItems
  return faqItems.filter((item) => {
    const haystack = normalize(item.question + ' ' + item.answer)
    return terms.every((term) => haystack.includes(term))
  })
}
