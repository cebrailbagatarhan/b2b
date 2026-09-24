# GPT-5.6 görev kartları

Bu dosya uygulanacak işleri tanımlar; güncel durum [ILERLEME.md](ILERLEME.md) içindedir. K/DB/UI/EXT kontrolleri ve karar kuralları [rehberde](README.md) tanımlanır. Karttaki mevcut dosyalar inceleme commit'ine dayanır; yeni yollar öneridir. Her görevde güncel kod okunur.

Bir kartın tam kabulü doğrulanmadıysa alt bölüm hazırlanmış olsa bile görev tamamlandı sayılmaz. Dış bağımlılık diğer bağımsız işleri otomatik durdurmaz. Kapsam dışı notları mevcut görev sınırını açıklar; güncel kullanıcı talimatı kapsamı değiştirebilir.

## T00 — Mevcut CI çalışmasını uzlaştır

- **Aşama / gereksinim:** M0; R01.
- **Ön koşul:** Yok; ilk giriş noktası.
- **Hedef:** Geliştirmeye tekrarlanabilir kurulum ve mevcut kalite kontrolleriyle başlamak.
- **Dosyalar:** `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `scripts/ci-auth-integration.mjs`, `src/lib/email.ts`; bu dosyaların bir kısmı PR #1'de.
- **Yapılacak:** PR #1'in durumunu ve son commit'ini doğrula. Birleşmişse güncel temeli kullan; açık ise verilen kapsam içinde bu çalışmayı geliştirme dalına dahil et veya bağımlılığı kaydet. Aynı CI ve SMTP bağımlılığı düzeltmelerini yeniden yazma. Çalışma dalının base commit'ini kaydet.
- **Kabul:** K: temiz kurulum, Prisma Client üretimi ve mevcut statik kontroller geçer. İlgili geliştirme commit'i için production build ve auth HTTP kontrollerinin sonucu vardır. Sadece başka bir commit'in yeşil çalışması yeterli değildir.
- **Sınır / engel:** Bu görev PR #1'i ana dala otomatik birleştirme veya production migration yapma talimatı değildir. Geçici DB'deki db push ile T01 bitmiş sayılmaz.

## T01 — SQL Server baseline ve güvenli migration

- **Aşama / gereksinim:** M0; R01.
- **Ön koşul:** T00
- **Hedef:** Mevcut veriyi koruyarak sıfırdan kurulabilen ve izlenebilen şema elde etmek.
- **Dosyalar:** `prisma/schema.prisma`, `prisma/migrations/README.md`, `prisma/migrations/**`; önerilen yeni: `docs/operations/database-migrations.md`.
- **Yapılacak:** Gerçek şemayı temsil eden yetkili export/test kopyasını mevcut migration dosyalarıyla karşılaştır. Uygulanmış değişiklikleri iki kez uygulamayan, incelenmiş baseline ve artımlı geçiş sırası hazırla. Ön kontrol, satır sayısı/ilişki kontrolü, uygulama uyumluluğu ve geri dönüş prosedürü ekle.
- **Kabul:** DB: boş veritabanı replay'i, dolu test kopyasında geçiş, veri korunumu ve yedekten geri yükleme ayrı ayrı kanıtlanır. Migration geçmişi gerçek şemayla uyuşur.
- **Sınır / engel:** Doğru şema export'u veya test SQL Server yoksa yalnız repo şemasından canlı baseline uydurma. Belge/ön kontrol hazırlanabilir; tam görev dış bağımlılık bekler. Üretimde reset/seed/db push çalıştırma.

## T02 — Para ve vergi hesaplama sözleşmesi

- **Aşama / gereksinim:** M0; R02.
- **Ön koşul:** T01
- **Hedef:** Fiyat, iskonto, vergi ve sipariş toplamını tek kuralla hesaplamak.
- **Dosyalar:** `prisma/schema.prisma`, `src/lib/order-integrity.ts`, `src/app/actions.ts`, `src/lib/store.ts`, tutar gösteren yönetim/hesap/sepet ekranları.
- **Yapılacak:** TRY fiyat/vergi oranı/yuvarlama kurallarını ayır. Para kolonlarını uygun Decimal tipine geçir; oranların tipini ayrıca tanımla. Sunucu hesaplama, API/Server Action serileştirmesi ve istemci görüntülemesini güncelle. Fatura ve kargo eklenmesine uygun net/vergi/brüt/indirim snapshot sözleşmesi hazırla.
- **Kabul:** K+DB: kesirli fiyat, birim çarpanı, iskonto, farklı vergi oranı ve yuvarlama örnekleri elle hesaplanan tutarla eşleşir. Geçiş öncesi/sonrası eski sipariş toplamları mutabık kalır. İstemci fiyatını değiştirerek tutar düşürülemez.
- **Sınır / engel:** Gerçek ürün vergi oranını tahmin etme. Bu görev kupon motoru veya kart sağlayıcısı entegrasyonu değildir.

## T03 — Tüketici ve bayi erişim/fiyat ayrımı

- **Aşama / gereksinim:** M0; R03.
- **Ön koşul:** T02
- **Hedef:** Perakende fiyatı açıkken bayi fiyatını ve cari yetkisini korumak.
- **Dosyalar:** `prisma/schema.prisma`, `src/lib/authorization.ts`, `src/lib/session.ts`, `src/lib/catalog-price-access.ts`, `src/lib/customer-status.ts`, `src/app/actions.ts`, `src/components/ProductCard.tsx`, `src/components/ProductDetailPurchase.tsx`.
- **Yapılacak:** CUSTOMER rolünden ayrı hesap türü ve fiyat kapsamı tanımla. Mevcut hesapları B2B olarak koru. Yeni B2C liste/satış fiyatını açıkça tanımla; varsa bayi taban fiyatını otomatik perakende fiyatı kabul etme. Anonim/B2C/aktif bayi/askıdaki bayi/admin erişim matrisini sunucuda uygula.
- **Kabul:** K+DB+UI: anonim/B2C yalnız yayınlanmış B2C fiyatını alır; yetkisiz yanıtlarda bayi fiyatı bulunmaz. B2C cari sipariş veremez. Aktif B2B'nin iskonto/limit/onay davranışı sürer; askıdaki bayi ayrıcalık alamaz.
- **Sınır / engel:** Kayıt arayüzü T10'dadır. Mevcut fiyat redaksiyonunu bütünüyle kaldırma; perakende fiyatı eksik ürün satışa açılmaz.

## T04 — Ürün, özellik, galeri ve varyant modeli

- **Aşama / gereksinim:** M1; R05.
- **Ön koşul:** T03
- **Hedef:** Katalog ekranlarının kullanacağı tutarlı ürün/SKU verisini kurmak.
- **Dosyalar:** `prisma/schema.prisma`, `prisma/migrations/**`, `src/lib/commerce-readiness.ts`, ürün okuma/yazma işlemleri.
- **Yapılacak:** Marka, kalıcı slug, taslak/yayında/arşiv durumu, sıralı görsel kaydı ve kategori özelliği ekle. Gerekli ürünlerde renk/beden vb. SKU varyantını birim/koli çarpanından ayır. Eski tek görsel ve varyantsız üründen geriye uyumlu geçiş yap; stok için tek otorite belirle.
- **Kabul:** K+DB: eski ürünler/siparişler açılır; varyant SKU tekilliği ve özellik bağları korunur; arşiv ürün satın alınamaz; varyant ve koli birlikte seçilince stok iki kez düşmez. Yeni zorunlu veri tamamlanmadan yayın engellenir.
- **Sınır / engel:** Barkod yalnız gerçek değer sağlandığında kaydedilir. Pazaryerine özgü alan/kimlikleri ortak ürün modeline yayma.

## T05 — Kalıcı görsel yükleme

- **Aşama / gereksinim:** M1; R06.
- **Ön koşul:** T04
- **Hedef:** Ürün görsellerinin dağıtımda kaybolmamasını sağlamak.
- **Dosyalar:** `src/app/api/upload/route.ts`, `src/app/admin/gorseller/page.tsx`, ürün görsel alanları; önerilen yeni: `src/lib/storage/`.
- **Yapılacak:** D07'ye göre storage adapter'ı bağla. Yetki, boyut/tür/içerik kontrolü, güvenli nesne anahtarı, görsel sıralaması ve eski URL geçişini uygula. Silme/temizlikte kullanılan dosyayı yanlışlıkla kaldırma.
- **Kabul:** K+UI+EXT: yetkisiz yükleme reddedilir; geçersiz içerik engellenir; gerçek test bucket'ına yüklenen görsel yeniden dağıtım veya ikinci instance'ta açılır; kırık resim durumu düzgün gösterilir.
- **Sınır / engel:** Sağlayıcı erişimi yoksa yerel adapter testi gerçek kalıcılık kanıtı değildir. Yeni hizmet satın alma veya mevcut bucket politikasını değiştirme kapsamını varsayma.

## T06 — Ürün düzenleme ve stok değişiklik kaydı

- **Aşama / gereksinim:** M1; R06.
- **Ön koşul:** T04, T05
- **Hedef:** İşletmenin ürünü ekledikten sonra yönetebilmesini sağlamak.
- **Dosyalar:** `src/app/admin/urunler/page.tsx`, `src/app/admin/urunler/yeni/page.tsx`, `src/app/admin/actions.ts`; önerilen yeni: `src/app/admin/urunler/[id]/duzenle/page.tsx`, stok/audit hizmeti.
- **Yapılacak:** Ortak ürün formu ile düzenleme, yayın/arşiv, varyant/görsel/özellik işlemlerini ekle. Fiyat ve stok değişikliğinde yetkili kullanıcı, neden, önce/sonra değeri kaydet. Stok değişiklikleri sipariş rezervasyonuyla tutarlı tek hizmetten geçsin.
- **Kabul:** K+DB+UI: ürün ekle→düzenle→yayınla→arşivle akışı geçer; eski sipariş snapshot'ı değişmez; yetkisiz rol güncelleyemez; stok/fiyat değişikliği izlenebilir.
- **Sınır / engel:** Siparişe bağlı ürünleri fiziksel silerek geçmişi bozma. Toplu Excel içe aktarma bu paketin kabul şartı değildir.

## T07 — Filtreli arama ve sayfalama

- **Aşama / gereksinim:** M1; R07.
- **Ön koşul:** T04
- **Hedef:** Müşterinin 20 sonuç sınırına takılmadan doğru ürüne ulaşması.
- **Dosyalar:** `src/app/actions.ts`, `src/app/arama/page.tsx`, `src/components/CategoryView.tsx`, `src/app/kategori/[slug]/page.tsx`, `src/app/kategori/[slug]/[childSlug]/page.tsx`.
- **Yapılacak:** Sunucuda doğrulanmış sorgu parametreleri, sonuç sayısı, kararlı sıralama, sayfalama ve kategori/marka/fiyat/stok filtreleri ekle. Filtreler URL'de saklansın; mobil panel, boş sonuç ve hata durumları olsun. Fiyat filtresi kullanıcının yetkili fiyat kapsamını kullansın.
- **Kabul:** K+DB+UI: 20'den fazla ürün erişilebilir; iki filtre birlikte doğru sonuç verir; aynı fiyatlı ürünler sayfa geçişinde tekrarlanmaz/kaybolmaz; geri tuşu seçimleri korur; aşırı limit/geçersiz parametre reddedilir.
- **Sınır / engel:** Fuzzy search, öneri servisi veya yeni arama altyapısı zorunlu değil. Tüm ürünleri istemciye gönderip filtreleme yapma.

## T08 — Ürün detayı ve vitrin

- **Aşama / gereksinim:** M1; R08.
- **Ön koşul:** T06, T07
- **Hedef:** Ürünün özelliklerini ve satın alma seçimini anlaşılır sunmak.
- **Dosyalar:** `src/app/urun/[id]/page.tsx`, `src/components/ProductDetailPurchase.tsx`, `src/components/ProductCard.tsx`, `src/components/HomeSections.tsx`, `src/components/HeroSlider.tsx` ve ilgili CSS.
- **Yapılacak:** Galeri, özellikler, varyant/birim, açık fiyat ve stok seçimini bağla. Mevcut banner altyapısını kullan. Teslimat/iade özeti yalnız doğrulanmış ayarlardan gelsin. Boş vitrindeki geliştirici/seed metnini müşteriye uygun hale getir.
- **Kabul:** K+UI: seçilen görsel/varyant/birim fiyat ve stokla tutarlı; geçersiz veya stok dışı kombinasyon sepete eklenmez; kırık görsel/boş açıklama anlaşılır; mobilde satın alma alanı kullanılabilir.
- **Sınır / engel:** Gerçek veri yokken yorum puanı, satış sayısı, indirim veya teslimat rozeti üretme. SEO T21'de genişletilir.

## T09 — Gerçek e-posta ve bildirim kuyruğu

- **Aşama / gereksinim:** M2; R04, R15.
- **Ön koşul:** T01
- **Hedef:** Kimlik doğrulama ve sipariş mesajları için güvenilir taşıyıcı kurmak.
- **Dosyalar:** `src/lib/email.ts`, parola sıfırlama rotaları, `prisma/schema.prisma`; önerilen yeni: `src/lib/notifications/` ve kuyruk işleyicisi.
- **Yapılacak:** T00'daki SMTP bağımlılığını kullan; sağlayıcı/SMTP hesabını D07 ile bağla. Kalıcı outbox, deneme sayısı, tekrar zamanı, hata durumu ve tekrar koruması ekle. İşlem mesajları ile pazarlama tercihlerini ayır.
- **Kabul:** K+DB+EXT: gerçek test alıcısına parola sıfırlama mesajı gider; geçici kesinti sonrası retry çalışır; aynı olay ikinci gönderimi oluşturmaz; URL/token/gövde loglara sızmaz.
- **Sınır / engel:** Yeni müşteri mesajlarını canlı kişilere göndermek bu karttan otomatik yetki almaz. Test alıcısı/hesap eksikse gerçek teslimat bekler; mail gönderilmediğinde başarılı işaretleme.

## T10 — Tüketici kaydı ve hesap doğrulaması

- **Aşama / gereksinim:** M2; R04.
- **Ön koşul:** T03, T09
- **Hedef:** Bireysel müşterinin bayi onayına takılmadan güvenli hesap açması.
- **Dosyalar:** `src/app/api/auth/register/route.ts`, giriş/session/reset rotaları, `src/app/kayit/page.tsx`, `src/lib/phone.ts`, `src/app/hesabim/AccountClient.tsx`.
- **Yapılacak:** D02 politikasını tüketici akışında uygula; bayi başvurusu ayrı kalsın. Tek kullanımlık/süreli doğrulama ve yeniden gönderim kuralı, genel hata mesajı ve rate limit ekle. Profil/parola ve oturum geçersizleştirme davranışını koru.
- **Kabul:** K+DB+UI+EXT: tüketici kayıt/doğrulama/giriş/kurtarma tamamlanır; yanlış/eskimiş/tekrar token reddedilir; bayi başvurusu onay bekler; üretim sabit SMS demo kodunu kabul etmez.
- **Sınır / engel:** Sadece production kayıt kontrolünü kaldırarak kayıt açma. SMS gerekiyorsa sağlayıcı entegrasyonu gerçek kabul senaryosuna eklenir.

## T11 — Misafir ve kullanıcı sepeti

- **Aşama / gereksinim:** M2; R09.
- **Ön koşul:** T03, T04
- **Hedef:** Sepeti oturumlar arasında tutarlı saklamak ve güncel tutarı göstermek.
- **Dosyalar:** `src/lib/store.ts`, `src/app/sepet/page.tsx`, `src/app/actions.ts`, `prisma/schema.prisma`; önerilen yeni: `src/lib/cart/`.
- **Yapılacak:** Misafir sepetini güvenli kimlikle tut; girişte deterministik biçimde kullanıcı sepetine birleştir. Sunucu fiyat teklifi üret; güncel stok ve fiyat farkını göster. Kullanıcı/vekil bayi değişiminde sepet sınırını koru.
- **Kabul:** K+DB+UI: girişte aynı satır iki kez çoğalmaz; ikinci cihazda kullanıcı sepeti açılır; kullanıcılar arasında sepet sızmaz; değişen fiyat/stok ödeme öncesi görünür; tarayıcıdaki fiyat sunucuyu değiştiremez.
- **Sınır / engel:** Mevcut Cart tablosunun varlığı senkronizasyonun tamamlandığı anlamına gelmez. Bu paket ödeme başlatmaz.

## T12 — Adres, fatura ve toplamı gösteren checkout

- **Aşama / gereksinim:** M2; R10.
- **Ön koşul:** T02, T10, T11, T20
- **Hedef:** Müşterinin satın alma öncesinde ne ödeyeceğini ve nereye teslim edileceğini bilmesi.
- **Dosyalar:** `src/app/sepet/odeme/page.tsx`, `src/components/CheckoutAddressSection.tsx`, `src/app/actions.ts`, `prisma/schema.prisma`; önerilen yeni: checkout teklif hizmeti.
- **Yapılacak:** Tüketici/misafir iletişim alanları, ayrı fatura/teslimat adresi, D05 kargo tarifesi, net/vergi/kargo/toplam ve koşul sürümü kabulünü bağla. Adres sahipliğini ve teklif güncelliğini sunucuda kontrol et. Mobilde tek kolon düzen ve alan bazlı hata ekle.
- **Kabul:** K+DB+UI: adres değişince kargo/toplam güncellenir; başkasının adresi kullanılamaz; zorunlu kabul eksikse ilerlenmez; hata halinde form kaybolmaz; sabit ücretsiz kargo yoktur.
- **Sınır / engel:** T14 bitmeden dış ödeme aktif olmaz. T20 metin/tarife değerleri yoksa açıkça test fixture kullan; üretimde eksik toplamla sipariş alma.

## T13 — Ödeme durumu ve stok rezervasyonu çekirdeği

- **Aşama / gereksinim:** M2; R11.
- **Ön koşul:** T02, T04, T11
- **Hedef:** Ödeme sırasında stok ve sipariş bütünlüğünü korumak.
- **Dosyalar:** `prisma/schema.prisma`, `src/app/actions.ts`, `src/lib/order-status.ts`, `src/lib/payment-capabilities.ts`; önerilen yeni: `src/lib/payments/`, `src/lib/inventory/`.
- **Yapılacak:** Sipariş, ödeme denemesi ve sevkiyat durumlarını ayır. Süreli rezervasyon ve stok hareketi kaydı ekle; süresi dolma işi, idempotency, para birimi ve tutar doğrulaması tanımla. Geç gelen başarılı ödeme için rezervasyon/stok/refund politikasını belgeleyip uygula. Mevcut B2B cari akışını uyumlu tut.
- **Kabul:** K+DB: son stok için iki eşzamanlı girişimde fazla satış olmaz; timeout/retry stoğu bir kez bırakır; aynı anahtar farklı tutar/adres için kullanılamaz; cari sipariş ve iptalin bakiye etkisi korunur.
- **Sınır / engel:** Provider yokken sahte tahsilat veya manuel tarayıcı bayrağıyla ödeme onayı oluşturma. Başarılı ödeme alınmış fakat rezervasyonu bitmiş sipariş sessizce yok sayılamaz.

## T14 — Gerçek ödeme sağlayıcısı ve webhook

- **Aşama / gereksinim:** M2; R11.
- **Ön koşul:** T12, T13
- **Hedef:** Doğrulanmış ödeme karşılığında tek sipariş onaylamak.
- **Dosyalar:** `src/lib/payment-capabilities.ts`, checkout, T13 ödeme hizmetleri; önerilen yeni: sağlayıcı adapter'ı ve `src/app/api/payments/...` rotaları.
- **Yapılacak:** D04 seçimi ve güncel resmî belgelerle hosted checkout bağla. Sağlayıcı kimliği, imza, zaman/replay, tutar ve para birimini kontrol et. Bildirimi kalıcı kaydet; tekrar işlemeyi ve sağlayıcıyla uzlaştırmayı destekle. Capability ancak gerçek yapılandırma ve akış hazırsa açılsın.
- **Kabul:** K+DB+UI+EXT: sandbox başarı, ret, iptal, tekrar webhook, yanlış tutar, kayıp dönüş sayfası ve geç bildirim senaryoları geçer. Kart numarası/CVV uygulamada işlenmez. Sipariş yalnız doğrulanmış tahsilatta onaylanır.
- **Sınır / engel:** Sağlayıcı/sandbox bilgisi yoksa adapter sözleşmesi hazırlanabilir fakat görev tamamlanmaz. Havale/EFT ayrıca gerçek hesap ve mutabakat kurulmadan açılmaz.

## T15 — Sevkiyat ve müşteri kargo takibi

- **Aşama / gereksinim:** M3; R12.
- **Ön koşul:** T14
- **Hedef:** Ödenen siparişi teslimata kadar izlemek.
- **Dosyalar:** `src/app/admin/siparisler/page.tsx`, `src/components/admin/OrderStatusControl.tsx`, `src/app/siparis-takip/page.tsx`, `src/lib/order-status.ts`, şema.
- **Yapılacak:** Hazırlama/sevkiyat olayları, taşıyıcı, takip numarası ve paket ilişkisi ekle. İlk sürümde yetkili yönetici girişi yeterli. Müşteriye durum geçmişi ve doğrulanmış takip bağlantısı göster; paket/satır yapısını kısmi sevke uygun tut.
- **Kabul:** K+DB+UI: ödenmemiş B2C sipariş sevk edilemez; yetkisiz rol durum değiştiremez; kayıtlı takip numarası müşterinin doğru siparişinde görünür; geçmiş olaylar kaybolmaz.
- **Sınır / engel:** Otomatik kargo etiketi/taşıyıcı API'si ayrı iştir. Sistemde veri yokken teslim edildi veya tarih garantisi gösterme.

## T16 — Fatura erişimi ve siparişe bağlı destek

- **Aşama / gereksinim:** M3; R14.
- **Ön koşul:** T14, T20
- **Hedef:** Müşteriye doğru belge ve sipariş bağlamında destek sunmak.
- **Dosyalar:** `src/app/hesabim/AccountClient.tsx`, `src/app/siparis-takip/page.tsx`, yönetim sipariş ekranı, şema; önerilen yeni: korumalı fatura erişimi ve destek talebi rotaları.
- **Yapılacak:** Geçerli fatura numarası/belgesi ve fatura adresi snapshot'ını siparişe bağla. Yetkili dosya yükleme/indirme ve siparişe bağlı destek talebi, not ve durum geçmişi ekle. Misafir erişimini süreli/güvenli kimlikle sınırla.
- **Kabul:** K+DB+UI: müşteri kendi faturası ve talebini görür; başka hesaba/anonime belge sızmaz; dosya erişim denetimi yalnız UI'a bırakılmaz; yönetici cevabı doğru taleple ilişkilidir.
- **Sınır / engel:** Taslak PDF'yi yasal e-fatura/e-arşiv diye sunma. Otomatik muhasebe entegrasyonu sonraki kapsam olabilir.

## T17 — İade talebi ve mal kabul

- **Aşama / gereksinim:** M3; R13.
- **Ön koşul:** T15
- **Hedef:** Müşterinin sipariş satırından izlenebilir iade başlatması.
- **Dosyalar:** `src/app/iade/page.tsx`, sipariş detayları, yönetim ekranı, şema; önerilen yeni: `src/lib/returns/`.
- **Yapılacak:** Ürün/adet/neden/kanıt ve talep durumlarını ekle. İade edilebilir miktarı önceki taleplerle birlikte kontrol et. Yönetim kabul/ret gerekçesi ve fiziksel mal kabulünde satılabilir/hasarlı kararını kaydetsin. İade koşulları T20'nin sürümlü verisinden gelsin.
- **Kabul:** K+DB+UI: satın alınandan fazla/tekrar iade engellenir; talep başkasının siparişinde açılamaz; mal kabul stok etkisi bir kez oluşur; müşteri kendi talep geçmişini görür.
- **Sınır / engel:** Talep açılması otomatik para/stok iadesi sayılmaz. T18 tamamlanana kadar gerçek refund sonucu gösterme.

## T18 — Tam ve kısmi para iadesi

- **Aşama / gereksinim:** M3; R13.
- **Ön koşul:** T14, T17
- **Hedef:** İade kararını doğru tutardaki sağlayıcı işlemiyle eşleştirmek.
- **Dosyalar:** T13/T14 ödeme hizmetleri, T17 iade hizmeti, yönetim iade ekranı, şema.
- **Yapılacak:** Satırdaki indirim/vergi/kargo dağılımına dayalı refund tutarı hesapla. Provider refund kimliği, idempotency, bekleme/başarısız/başarılı durum ve uzlaştırma ekle. B2B cari ters kaydıyla kart para iadesini ayrı uygula.
- **Kabul:** K+DB+EXT: kısmi/tam refund, tekrar istek, ağ kesintisi ve sağlayıcı başarısızlığı senaryoları geçer. Toplam refund tahsilatı aşmaz; stok T17'yle iki kez artmaz; sağlayıcı sonucu olmadan tamamlandı görünmez.
- **Sınır / engel:** İade tutarını sadece istemciden alma. İade mal kabulü ile finansal iade zamanını aynı varsayma.

## T19 — Sipariş olaylarından gerçek bildirim

- **Aşama / gereksinim:** M3; R15.
- **Ön koşul:** T09, T14, T15, T18
- **Hedef:** Müşteriye doğru olayda doğru mesajı ulaştırmak.
- **Dosyalar:** `src/lib/email.ts`, T09 outbox, sipariş/ödeme/sevkiyat/iade hizmetleri ve yönetim bildirim durumu.
- **Yapılacak:** Sipariş alındı, ödeme sonucu, sevk ve iade sonucunu outbox ile aynı transaction sınırına bağla. Şablonları doğrulanmış tutar/takip bilgisinden üret. Hata/yeniden deneme ekranı ve kontrollü tekrar gönderim ekle.
- **Kabul:** K+DB+EXT: her olay gerçek test alıcısına doğru içerikle gider; rollback olmuş sipariş için mesaj gitmez; duplicate olay ikinci mesaj üretmez; başarısız mesaj görünür.
- **Sınır / engel:** Pazarlama izni işlem e-postasıyla aynı bayrakta tutulmaz. Test alıcıları dışına toplu mesaj gönderme yetkisi varsayılmaz.

## T20 — Mağaza bilgileri ve satış koşulları

- **Aşama / gereksinim:** M4; R10, R16.
- **Ön koşul:** T00
- **Hedef:** Gerçek işletme bilgisi ve checkout'un kullanacağı sürümlü içerik sağlamak.
- **Dosyalar:** `src/app/hakkimizda/page.tsx`, `src/app/iletisim/page.tsx`, `src/app/gizlilik/page.tsx`, `src/app/iade/page.tsx`, `src/app/sss/page.tsx`, `src/components/Footer.tsx`, `src/components/Header.tsx`; önerilen yeni: sürümlü mağaza/koşul yapılandırması.
- **Yapılacak:** D05/D06 kapsamında şirket, destek, teslimat, iade, gizlilik, ön bilgilendirme/satış metinleri ve iletişim tercihlerini yapılandır. İçerik sürümü ve kabulün neye ait olduğunu tanımla. Zorunlu olmayan izleme için uygun tercih akışı kur; sahte telefon/vaatleri yayınlama.
- **Kabul:** K+UI: sayfalar gerçek doğrulanmış bilgiler içerir; içerik değişince yeni sürüm oluşur; checkout kabul kaydı sürüme bağlanabilir; tercih kaydı sonradan değiştirilebilir.
- **Sınır / engel:** İşletme/hukuk onayı ve gerçek değerler sağlanmadıysa taslak olarak belirt ve yayın engelini kaydet. Bu görev diğer DB işlerinden bağımsız erken yapılabilir.

## T21 — Ürün ve kategori SEO'su

- **Aşama / gereksinim:** M4; R16.
- **Ön koşul:** T07, T08, T20
- **Hedef:** Yayınlanmış mağaza içeriğinin doğru başlık ve fiyatla indekslenmesi.
- **Dosyalar:** `src/app/layout.tsx`, ürün/kategori rotaları; önerilen yeni: `src/app/sitemap.ts`, `src/app/robots.ts`, ürün metadata ve structured-data yardımcıları.
- **Yapılacak:** Kalıcı URL, metadata, canonical, yönlendirme, sitemap ve uygun indeksleme kuralları ekle. Product/Breadcrumb verisini görünür B2C fiyat/stok içeriğiyle eşleştir. Filtre kombinasyonlarının gereksiz indekslenmesini önle.
- **Kabul:** K+UI: ürün/kategori HTML'inde doğru metadata vardır; sitemap yalnız yayınlanabilir URL içerir; structured data'da bayi fiyatı veya uydurma puan yoktur; eski URL yönlendirmesi döngü yapmaz.
- **Sınır / engel:** Arama motoru indeksleme garantisi verme. Robots dosyasını özel sipariş/fatura erişim kontrolü yerine kullanma.

## T22 — Mobil ve erişilebilir uçtan uca alışveriş

- **Aşama / gereksinim:** M4; R17.
- **Ön koşul:** T08, T12, T15, T17, T18, T21
- **Hedef:** Bir müşterinin gerçek alışveriş yolunu mobilde tamamlayabilmesi.
- **Dosyalar:** İlgili vitrin/checkout/hesap/iade bileşenleri ve CSS; önerilen yeni: kritik tarayıcı akışı testleri.
- **Yapılacak:** 360/390/768 px ve masaüstünde arama→ürün→sepet→checkout→takip→iade akışını doğrula. Klavye odağı, alan etiketleri, görünür hatalar ve yükleme/boş durumlarını düzelt. Sepet/formun geri tuşu ve ödeme dönüşünde korunmasını dene.
- **Kabul:** K+UI: yatay taşma/erişilemeyen buton yok; klavye ile ana görevler tamamlanır; hatalı ödeme/veri halinde tekrar denenebilir; görüntü yüklenince kritik kontroller yer değiştirmez.
- **Sınır / engel:** Sadece ekran görüntüsü çalışan satış döngüsünü kanıtlamaz. Bütün UI'ı yeniden tasarlamak yerine doğrulanmış problemleri gider.

## T23 — Operasyon izleme ve dönüşüm olayları

- **Aşama / gereksinim:** M4; R18.
- **Ön koşul:** T14, T18, T19
- **Hedef:** Ödeme hatasını, bekleyen işleri ve alışveriş kaybını görünür yapmak.
- **Dosyalar:** `src/app/api/health/route.ts`, ödeme/outbox hizmetleri, yönetim; önerilen yeni: log/ölçüm adapter'ları ve `docs/operations/runbook.md`.
- **Yapılacak:** Correlation ID, redakte log, hata alarmı, bekleyen ödeme/refund/outbox görünümü ve güvenli retry ekle. Ürün/sepet/checkout/satın alma/iade olaylarını tanımla. Birden fazla instance varsa merkezi rate limit kur; ortam, secret, yedek ve rollback prosedürlerini yaz.
- **Kabul:** K+DB+EXT: simüle servis hatası alarm oluşturur; sır/kişisel veri logda yoktur; satın alma olayı doğrulanmış tahsilat başına tektir; tekrar dene ikinci refund yaratmaz; çok-instance sınırı atlanamaz.
- **Sınır / engel:** Onaysız analytics veya müşteri verisi paylaşımı ekleme. Health endpoint'i ayrıntılı bağlantı/sır döndürmez.

## T24 — Satış açılışı kabul paketi

- **Aşama / gereksinim:** M4; R18.
- **Ön koşul:** T00, T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T16, T17, T18, T19, T20, T21, T22, T23
- **Hedef:** Birleşik sürümün satışa hazır olduğunu kanıtlamak.
- **Dosyalar:** `docs/gpt-5.6/ILERLEME.md`, operasyon runbook'u, CI kanıtları ve dağıtım yapılandırması.
- **Yapılacak:** T00–T23 kanıtlarını aynı yayın adayına karşı kontrol et. Migration/restore, başarılı ve başarısız ödeme, stok yarışı, yetki, teslimat, fatura, refund, bildirim, mobil ve izlemeyi staging'de doğrula. Somut sürüm, geri dönüş ve bilinen sınırlamalar kaydı hazırla.
- **Kabul:** K+DB+UI+EXT: yayın adayı tüm P0 kabul kontrollerini geçer; çözümlenmemiş dış bağımlılık yoktur; iş sahibi gerçek hizmet/metin değerlerini doğrulamıştır. Canlı yayın yetkisi varsa planı uygula ve smoke sonucu kaydet.
- **Sınır / engel:** Yalnız açık PR veya helper testlerini üretim hazır sayma. Canlı yayın yetkisi yoksa onaya hazır adayla dur; hazır olmayan sürümü yayınlama.

## T25 — Kalıcı favoriler

- **Aşama / gereksinim:** M5; R19.
- **Ön koşul:** T24
- **Hedef:** Kalp düğmesini gerçek kayda ve listeye bağlamak.
- **Dosyalar:** `src/components/ProductCard.tsx`, `src/components/Header.tsx`, hesap ekranı, şema; önerilen yeni: favoriler sayfası ve yetkili işlemler.
- **Yapılacak:** Ürün/SKU favorisi için tekillik ve hesap sahipliği uygula; gerçek sayaç, liste, ekle/çıkar ve gerekiyorsa misafirden hesaba aktarım ekle.
- **Kabul:** K+DB+UI: yenileme/ikinci cihazda kayıt korunur; sayaç doğru; tekrar tıklama duplicate oluşturmaz; başka müşteri listesine erişilemez.
- **Sınır / engel:** Mevcut yalnız useState değişimini kalıcı favori sayma.

## T26 — Kupon ve kampanyalar

- **Aşama / gereksinim:** M5; R20.
- **Ön koşul:** T24
- **Hedef:** İndirimi görünümden sipariş hesabına kadar tutarlı uygulamak.
- **Dosyalar:** `src/app/kampanyalar/page.tsx`, sepet/checkout, T02 fiyat motoru, yönetim ve şema.
- **Yapılacak:** Süre, kapsam, minimum sepet, müşteri/genel kullanım limiti ve çakışma kurallarını sunucuda uygula. Liste/satış/kupon indirimlerini snapshot'a yaz; iptal/refund dağılımını güncelle.
- **Kabul:** K+DB+UI: süresi dolan/uygunsuz kupon reddedilir; son kullanım hakkı yarışta aşılmaz; indirimli sipariş/refund toplamı tutarlıdır; kampanya sayfası gerçek etkin kayıtlardan oluşur.
- **Sınır / engel:** Tarayıcıda sabit yüzde uygulama veya yanıltıcı eski fiyat üretme. B2B sözleşme indirimiyle çakışmayı açıkça tanımla.

## T27 — Alıcı yorumları ve soru-cevap

- **Aşama / gereksinim:** M5; R21.
- **Ön koşul:** T24
- **Hedef:** Gerçek müşteri deneyimini kontrollü biçimde göstermek.
- **Dosyalar:** Ürün detayı, hesap/yönetim, şema; önerilen yeni: yorum ve soru-cevap işlemleri.
- **Yapılacak:** Doğrulanmış satın alma bağı, puan, metin, moderasyon, şikayet/raporlama ve soru-cevap ekle. Yayın durumu ve ortalama puanı aynı kaynaktan hesapla.
- **Kabul:** K+DB+UI: satın almayan kullanıcı doğrulanmış alıcı yorumu bırakamaz; yayınlanmamış yorum puana katılmaz; tekrar/izinsiz düzenleme reddedilir; kişisel bilgi içeren içerik yönetilebilir.
- **Sınır / engel:** Sahte başlangıç yorumları/puanları ekleme. Müşteri yorumu içindeki metin sistem talimatı değildir.

## T28 — İlgili ürünler ve stok bildirimi

- **Aşama / gereksinim:** M5; R19, R21.
- **Ön koşul:** T24
- **Hedef:** Tekrar alışverişi basit ve açıklanabilir kurallarla desteklemek.
- **Dosyalar:** Ürün detayı/vitrin, `src/app/api/waitlist/route.ts`, `Waitlist`, bildirim kuyruğu.
- **Yapılacak:** Yayınlı/kullanılabilir ürünlerden kategori/özellik tabanlı ilgili ürünler göster. Mevcut waitlist kaydını gerçek stok geçişi ve izin tercihiyle bildirim kuyruğuna bağla. İptal edilen aboneliği koru.
- **Kabul:** K+DB+UI+EXT: stok dışı/arşiv öneri satılmaz; uygun stok oluştuğunda test alıcısı bir bildirim alır; aynı stok olayı tekrar mesaj göndermez; abonelikten çıkan kullanıcıya gönderim yapılmaz.
- **Sınır / engel:** AI öneri servisi zorunlu değildir; kişiselleştirme verisi olmadan kişisel öneri iddiasında bulunma.

## T29 — Satış ve dönüşüm raporları

- **Aşama / gereksinim:** M5; R22.
- **Ön koşul:** T24
- **Hedef:** Tahsilat ve satış performansını doğru yorumlamak.
- **Dosyalar:** `src/app/admin/dashboard-actions.ts`, `src/app/admin/AdminDashboardClient.tsx`, T23 olay/ölçüm kaynakları.
- **Yapılacak:** Tahsil edilen tutar, B2B cari satış, iptal, refund ve net satışı ayrı tanımla. Sipariş sevk durumunu gelir filtresi olarak kullanma. Arama/ürün/sepet/checkout kaybını anonim ve izinli ölçümle raporla.
- **Kabul:** K+DB+UI: aynı sipariş hazırlanıyor/sevk edildi olunca tahsilat toplamı değişmez; kısmi refund doğru düşer; cari alacak kart tahsilatıyla karışmaz; rapor seçili dönem/saat dilimiyle mutabık.
- **Sınır / engel:** Trafik veya başlangıç verisi yokken büyüme/dönüşüm oranı uydurma.


