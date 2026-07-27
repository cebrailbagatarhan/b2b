# Pazaryeri, B2B ve B2C Eksikleri ile Entegrasyon Planı

Tarih: 17 Temmuz 2026

Kapsam: TopTan Market'in Trendyol V2 gibi pazaryerlerine, kurumsal B2B satışa ve doğrudan tüketiciye B2C satışa hazırlanması.

## Kısa Sonuç

Proje bugün temel B2B katalog, bayi onayı, cari limit ve sipariş çekirdeğine sahiptir. Ancak doğrudan Trendyol'a ürün/sipariş bağlamak veya aynı uygulamayı üretim kalitesinde B2C mağaza olarak açmak için henüz hazır değildir.

Bu pakette canlı veritabanına migration uygulamadan şu güvenli temel eklendi:

- Yönetim panelinde `/admin/kanal-hazirlik` katalog hazırlık merkezi
- Yetkili yöneticiler için `/api/admin/catalog-readiness` üzerinden akış halinde, formül enjeksiyonuna karşı korumalı UTF-8 CSV hazırlık çıktısı
- Mevcut ürünlerde B2B, B2C ve pazaryeri için eksik alanları ayrı gösteren doğrulama kuralları
- Gerçek sağlayıcı/webhook olmadan stok tutan kredi kartı siparişlerinin sunucuda reddedilmesi
- Gerçek banka hesabı ve mutabakat akışı olmadan havale siparişi oluşturulmasının sunucuda reddedilmesi; örnek IBAN'ın ekrandan kaldırılması
- Mevcut `PENDING_PAYMENT` ve `PENDING_TRANSFER` siparişlerini yalnız sahibi olan müşterinin iptal edip stoğu bir kez geri bırakabilmesi
- Aynı idempotency anahtarının farklı teslimat adresiyle tekrar kullanılmasının reddedilmesi
- Bayi fiyatlarının anonim, geçersiz veya askıdaki oturumlara Server Action yanıtında gönderilmemesi

CSV bir Trendyol yükleme dosyası değildir. Amaç, eksik katalog verisini güvenli biçimde bulmak ve sonraki kanal adapter'ına temiz girdi hazırlamaktır.

## Güncel Kanal Hazırlık Matrisi

| Alan | Mevcut durum | B2B etkisi | B2C etkisi | Pazaryeri etkisi | Öncelik |
|---|---|---|---|---|---|
| Stok kodu, ad, açıklama | Temel alanlar var | Kullanılabilir | Açıklama kalitesi eksik olabilir | Gerekli fakat tek başına yetersiz | P0 |
| Barkod/GTIN | Modelde yok | Birim/koli barkodu yönetilemez | Omnichannel eşleme zayıf | Ürün aktarımı engeli | P0 |
| Marka | Modelde yok | Marka bazlı sözleşme/katalog yok | Filtre ve SEO eksik | Marka eşleme engeli | P0 |
| Model kodu/varyant | Modelde yok | Renk/beden/paket varyantı yok | Varyantlı ürün satılamaz | `productMainId` gruplaması yok | P0 |
| Kategori özellikleri | Key/value özellik modeli yok | Teknik ürün filtresi yok | Filtre/karşılaştırma zayıf | Zorunlu kanal attribute eşlemesi yok | P0 |
| Görseller | Tek `imageUrl`, yerel upload | Temel kullanım | Galeri/alt metin eksik | Çoklu HTTPS görsel ve kalite kontrolü eksik | P0 |
| KDV/vergi | Ürün ve satır snapshot'ında yok | Fatura/mutabakat eksik | KDV dahil fiyat gösterimi güvenilir değil | `vatRate` aktarımı yok | P0 |
| Fiyat | `Float`, tek temel fiyat + genel bayi iskontosu | Sözleşmeli ve hacim fiyatı yok | Liste/satış fiyatı ve kampanya yok | Kanal fiyatı/komisyon marjı yok | P0 |
| Stok | Tek toplam stok, siparişte doğrudan düşüm | Depo ve hareket defteri yok | Rezervasyon süresi yok | Kanal tamponu ve uzlaştırma yok | P0 |
| Satış birimi | Birim adı ve çarpan var | İyi başlangıç | Paket kuralı sınırlı | Birim barkodu/desi yok | P1 |
| Sipariş | Snapshot ve idempotency var | Temel akış var | Misafir/B2C akışı yok | Dış sipariş/paket/satır kimlikleri yok | P0 |
| Ödeme | Cari hesap var; dış yöntemler tamamlanmamış | Vade/ledger/tahsilat yok | Gerçek online ödeme yok | Pazaryeri tahsilat/komisyon uzlaştırması yok | P0 |
| Kargo | Adres snapshot'ı var | Takip/kısmi sevk yok | Kargo ücreti/SLA yok | Paket, etiket ve taşıyıcı eşleme yok | P0 |
| Fatura | Model/entegrasyon yok | Cari-fatura bağı yok | E-arşiv/e-fatura akışı yok | Paket bazlı fatura gönderimi yok | P0 |
| İade | Yalnız tam admin iptali | RMA/mal kabul yok | Tüketici iade talebi yok | Claim state machine yok | P0 |
| Kampanya/kupon | Placeholder | Müşteri sözleşmesi dışında yok | Kupon/sepet kampanyası yok | Kanal kampanyası/indirim snapshot'ı yok | P1 |
| Bildirim | Parola sıfırlama adapter'ı var | Sipariş/limit bildirimi yok | Sipariş/kargo bildirimi yok | Webhook/outbox/dead-letter yok | P0 |
| Audit/operasyon | Sınırlı | Finansal değişiklik izi yok | Destek operasyonu zayıf | Retry, sapma ve uzlaştırma ekranı yok | P0 |

## Trendyol İçin Güncel Teknik Hedef

Yeni çalışma yalnız Product V2 üzerine kurulmalıdır. Trendyol'un resmî bildirimi Product V1 servislerinin 10 Ağustos 2026'dan itibaren geçersiz olacağını söylüyor. [Product V1 kapanış bildirimi](https://developers.trendyol.com/v2.0/docs/product-api-endpoint)

Resmî Product V2 akışı ürün aktarımından önce marka, kategori, kategori özelliği ve özellik değerlerinin alınmasını ister. Bir istekte en fazla 1.000 ürün gönderilebilir; sonuç, yanıttaki `batchRequestId` ile ayrıca izlenmelidir. Gerekli çekirdek alanlar barkod, başlık, model kodu, marka, kategori, miktar, stok kodu, açıklama, liste/satış fiyatı, görseller, KDV ve kategori özellikleridir. [Trendyol Product V2](https://developers.trendyol.com/v2.0/docs/product-create-v2)

Kimlik bilgileri Basic Auth ile yalnız sunucuda kullanılmalı; her istekte uygun `User-Agent` bulunmalıdır. Resmî genel sınır aynı endpoint için 10 saniyede 50 istektir. Ayrıca 14 Eylül 2026'dan itibaren ürün okuma, ürün yazma ve stok/fiyat yazma servisleri satıcı ürün limitine bağlı ortak gruplar halinde sınırlandırılacaktır. [Yetkilendirme ve genel limit](https://developers.trendyol.com/v2.0/docs/authorization), [ürün servis limitleri](https://developers.trendyol.com/v2.0/docs/1-service-limitations)

Webhook tek veri kaynağı kabul edilmemelidir. Trendyol başarısız webhook bildirimlerini yeniden dener, hatalı webhook'u pasife alabilir ve siparişlerin `getShipmentPackages` ile periyodik olarak yeniden eşitlenmesini önerir. [Webhook modeli ve öneriler](https://developers.trendyol.com/v2.0/docs/webhook-model)

### Trendyol V2 ürün sözleşmesi için eksik alanlar

- `barcode`: SKU/varyant düzeyinde, başlangıçta nullable; dolu değerlerde filtreli unique indeks
- `modelCode`: aynı ürünün varyantlarını birleştiren ana kod
- `brandId` ve ortak `Brand` tablosu
- `vatRate`
- `originCountry`
- `dimensionalWeight`
- `deliveryDuration`
- sıralı `ProductImage[]`; yalnız doğrulanmış HTTPS/object-storage URL'leri
- `ProductAttribute[]`; ortak özellik + kanal özellik eşlemesi
- kanal yaprak kategori kimliği ve kategori/özellik eşleme durumu
- liste fiyatı, satış fiyatı ve para birimi
- sevk ve iade depo eşlemeleri

Bu alanların hiçbiri doğrudan Trendyol'a özel kolon adlarıyla bütün iş modeline yayılmamalıdır. Ortak ürün modeli ve kanal eşleme tabloları ayrılmalıdır.

## Hedef Kanal Mimarisi

```text
Ortak katalog + fiyat + kullanılabilir stok
                 |
                 v
        Kanal eşleme ve doğrulama
                 |
                 v
       Transactional outbox / iş kuyruğu
                 |
       +---------+---------+
       |         |         |
  Trendyol V2  Hepsiburada  n11 / diğer
       |         |         |
       +---------+---------+
                 |
        webhook + periyodik uzlaştırma
```

Önerilen ortak modeller:

- `SalesChannel`: kanal kodu, ortam, aktiflik ve satıcı kimliği; API secret değerleri burada açık tutulmaz
- `ChannelListing`: iç SKU/varyant, kanal, dış ürün/listing/barcode kimlikleri, yayın durumu, son hata ve son başarılı senkron
- `CategoryMapping`, `BrandMapping`, `AttributeMapping`: iç veri ile kanal kimliklerinin sürümlü eşlemesi
- `SyncJob`/`IntegrationOutbox`: olay türü, aggregate kimliği, payload hash'i, deneme sayısı, sonraki deneme, son hata ve dead-letter durumu
- `WebhookEvent`: kanal olay kimliği/payload hash'i, teslim zamanı, işlenme durumu ve tekrar koruması
- `ExternalOrder`, `ExternalPackage`, `ExternalOrderLine`: sipariş numarası, paket kimliği ve satır kimliğini birbirinden ayrı saklayan snapshot
- `ChannelInvoice`: paket, fatura numarası, link/dosya durumu ve kanal doğrulama sonucu
- `ChannelClaim`: iade satırı, neden, kanıt, karar son tarihi, durum ve stok/refund sonucu

Tüm dış kimlikler string saklanmalıdır. Kanal numaralarının bugünkü hane sayısına göre `Int` seçilmemelidir.

## P0 — Önce Yapılması Gerekenler

### 1. Güvenli veritabanı başlangıcı

- Canlı SQL Server tam yedeği ve ayrı test restore'u
- Mevcut gerçek şemadan incelenmiş baseline
- `_prisma_migrations` geçmişinin veri kaybetmeden kurulması
- Her yeni migration için test DB, veri ön kontrolü ve rollback/runbook

Bu tamamlanmadan canlı katalog/kanal migration'ı uygulanmaz.

### 2. Katalog hazırlık migration'ı

- `Brand` ve sıralı `ProductImage`
- Üründe nullable barkod, model kodu, KDV, menşei, desi ve aktif/taslak durumu
- Barkod dolu değerler için filtreli unique indeks
- Çoklu ürün özelliği ve varyant grubu
- Mevcut tek `imageUrl` alanını geçiş boyunca geriye uyumlu okuma
- Admin ürün düzenleme, arşivleme ve toplu veri tamamlama

### 3. Para ve vergi bütünlüğü

- `Float` yerine mutabakatlı `Decimal`
- Ürün fiyatında liste/satış fiyatı, fiyat tipi, kanal/fiyat-listesi kapsamı, başlangıç/bitiş zamanı
- Sipariş satırında net, KDV, brüt, kampanya, kanal indirimi ve komisyon snapshot'ı
- Aynı ürün + para birimi + fiyat tipi için veritabanı benzersizliği
- Tek merkezi fiyat çözücü; kart, sepet, checkout ve kanal adapter'ı aynı sonucu kullanmalı

### 4. Kullanılabilir stok ve hareket defteri

- Depo bazlı fiziksel stok
- Rezerve, kullanılabilir, hasarlı ve yoldaki stok
- Her değişimi belge/sipariş/iade ile bağlayan stok hareket defteri
- Ödeme rezervasyon süresi ve zaman aşımında otomatik bırakma
- Kanal bazlı güvenlik tamponu ve oversell engeli
- Stok/fiyat sapma uzlaştırması

### 5. Dış sipariş, paket ve webhook çekirdeği

- Dış sipariş/paket/satır kimliklerini ayrı tutma
- Webhook'ta hızlı `2xx`, kalıcı kuyrukta asenkron işleme
- Payload hash + dış kimlik + son değişiklik zamanı ile idempotent tüketim
- Exponential backoff, jitter, dead-letter ve manuel tekrar dene
- Webhook'a ek periyodik sipariş/stok/fiyat uzlaştırması
- Kanal limitlerine göre ayrı rate-limit kovaları

### 6. Fatura, kargo ve iade

- Fatura ve teslimat adresi snapshot'larını ayırma
- E-fatura/e-arşiv numarası, KDV ve sipariş toplam mutabakatı
- Taşıyıcı, servis, takip numarası, etiket, desi, koli ve kısmi sevk
- Müşteri satır/adet bazlı iade talebi
- Mal kabul, tekrar satılabilir/hasarlı kararı, stok hareketi ve refund
- Pazaryeri claim durum makinesi ve karar süresi

## B2B İçin Eksikler

Shopify'ın resmî B2B örneğinde miktar artımı, minimum/maksimum adet ve hacim fiyatı varyant düzeyinde uygulanır. Bu proje yalnız birim çarpanı ve müşteriye genel iskonto taşır; sözleşmeli katalog/fiyat motoru değildir. [B2B miktar ve hacim fiyatı örneği](https://help.shopify.com/en/manual/b2b/catalogs/quantity-pricing)

Eklenmesi gerekenler:

- `Company -> Location -> Contact` ayrımı; tek müşteri kaydına bütün şirketi sıkıştırmama
- Lokasyon bazlı VKN/vergi durumu, fatura adresi, teslimat adresi ve satın almacı yetkisi
- Müşteri/şube bazlı katalog ve fiyat listesi
- Ürün/varyant bazlı minimum, maksimum ve sipariş adımı
- Hacim/kademe fiyatı ve kampanya çakışma kuralları
- Net 7/15/30/45/60/90 gibi vade, depozito ve kısmi tahsilat
- Değişmez cari hareket defteri; borç, alacak, tahsilat, iade ve düzeltme kayıtları
- Müşteri satın alma sipariş numarası (`PO number`)
- Taslak sipariş, teklif/RFQ ve çok seviyeli şirket içi onay
- CSV/SKU ile hızlı sipariş ve tekrar sipariş
- Satış temsilcisi, şube, depo ve mali işler için ayrık yetkiler
- Vergi belgesi/evrak doğrulama, ret nedeni ve onboarding audit kaydı
- B2B fiyatlarının yetkisiz Server Action/RSC/API yanıtlarından da çıkarılması

## B2C İçin Eksikler

- Bayi onayından ayrı tüketici hesap türü ve açık kayıt politikası
- Misafir checkout kararı
- KDV dahil fiyat, kargo ücreti ve sipariş toplamı snapshot'ı
- Gerçek barındırılan ödeme sayfası ve doğrulanmış webhook
- Mesafeli satış, ön bilgilendirme ve açık onay kayıtları; metinler hukuk danışmanı tarafından onaylanmalı
- Tüketiciye satır bazlı iptal/iade, refund ve bildirim
- Kampanya, kupon, kullanım limiti, minimum sepet ve çakışma motoru
- Kalıcı favoriler, yorum/moderasyon ve ürün karşılaştırma
- SEO metadata, canonical, sitemap, structured data ve yönlendirme yönetimi
- KVKK veri erişim/silme prosedürü, iletişim izinleri ve denetim kaydı

## Operasyon Ekranları

Kanal entegrasyonu yalnız arka planda API çağrısı olmamalıdır. Yönetim panelinde en az şu ekranlar gerekir:

- Kanal bağlantı sağlığı ve son başarılı istek
- Eşlenmemiş kategori, marka ve özellikler
- Ürün aktarım batch sonucu ve reddedilme nedenleri
- Stok/fiyat sapması
- Kaçan/tekrarlanan sipariş ve uzlaştırma sonucu
- Webhook hatası, retry ve dead-letter kuyruğu
- Faturasız veya SLA'sı yaklaşan paketler
- Açık iade/claim ve karar son tarihi
- Manuel tekrar dene, yeniden uzlaştır ve güvenli yeniden gönder
- Kim, neyi, ne zaman değiştirdi audit kaydı

## Güvenlik Kuralları

- Kanal API key/secret değerleri istemci bundle'ına, URL'ye, Git'e veya loglara girmez
- Secret değerleri şifreli secret store'da; erişim ve rotasyon kayıtlı
- Her kanal isteğinde correlation ID; loglarda token, müşteri telefonu/adresi ve fatura içeriği redakte
- Webhook doğrulaması, replay koruması, gövde boyutu sınırı ve zaman aşımı
- Admin'in manuel retry işlemi rol ve audit kontrolüne bağlı
- Aynı olay tekrar geldiğinde ikinci sipariş, stok veya refund oluşmaz
- Kanal devre dışı kaldığında checkout ve iç sipariş akışı kontrollü biçimde çalışmaya devam eder

## Kabul Ölçütleri

Bir kanal “hazır” sayılmadan önce:

1. Test DB migration ve geri dönüşü kanıtlanmış olmalı.
2. Eksiksiz ürün Trendyol V2 stage'e aktarılmalı; `batchRequestId` başarı sonucu kaydedilmeli.
3. Eksik marka/kategori/özellik/KDV/görsel içeren ürün adapter tarafından gönderilmeden reddedilmeli.
4. Aynı stok/fiyat olayı tekrar işlendiğinde ikinci yan etki oluşmamalı.
5. Webhook tekrarları ve webhook kesintisi sonrası periyodik uzlaştırma eksik siparişi tamamlamalı.
6. Paket bölme, iptal, fatura, kargo ve iade stage senaryoları geçmeli.
7. 429 yanıtında kanal kuyruğu backoff uygulamalı; diğer kanallar bloklanmamalı.
8. Secret veya müşteri kişisel verisi loglarda görünmemeli.
9. B2B fiyatı yetkisiz HTTP/RSC/Server Action yanıtında bulunmamalı. Bu paket ürün sorgularını sunucu tarafında redakte eder; yeni kanal API'leri de aynı sınırı korumalıdır.
10. Tam test, typecheck, production build ve kontrollü staging smoke CI üzerinde geçmeli.

## Bu Pakette Bilinçli Olarak Yapılmayanlar

- Trendyol, Hepsiburada, n11 veya başka kanala gerçek API çağrısı
- API credential kaydetme
- Canlı veritabanı migration'ı veya veri yazma
- Barkod/marka/varyant alanlarını mevcut Prisma Client'a yarım biçimde ekleme
- Gerçek ödeme, fatura, kargo veya iade sağlayıcısı entegrasyonu
- 3 GB'ın altında kullanılabilir RAM varken Next sunucusu, tam build veya tam `tsc`

Bu sınırlar, incelenmiş baseline ve dış servis hesapları olmadan uygulamayı bozacak yarım bir entegrasyon bırakmamak içindir.

## Hafif Doğrulama

- Başlangıç ölçümü: 15,73 GB toplam / 2,94 GB kullanılabilir RAM; son ölçüm 3,58 GB. 3000 ve 3100 portları boştu.
- `NODE_OPTIONS=--max-old-space-size=256` ile 112/112 TypeScript/TSX kaynağı sözdizimi kontrolünden geçti.
- Aynı sınırla 12 dosyada 49/49 güvenlik, sipariş, fiyat gizliliği ve kanal hazırlık testi geçti.
- Bu pakette değişen TypeScript/TSX ve test dosyaları hedefli ESLint kontrolünden hatasız geçti.
- Sunucu, tam `next build`, tam `tsc`, canlı API çağrısı ve veritabanı migration'ı çalıştırılmadı.

## Resmî Kaynaklar

- [Trendyol Product V2 oluşturma](https://developers.trendyol.com/v2.0/docs/product-create-v2)
- [Trendyol Product V1 kapanış bildirimi](https://developers.trendyol.com/v2.0/docs/product-api-endpoint)
- [Trendyol yetkilendirme ve genel istek sınırı](https://developers.trendyol.com/v2.0/docs/authorization)
- [Trendyol ürün servis limitleri](https://developers.trendyol.com/v2.0/docs/1-service-limitations)
- [Trendyol webhook modeli](https://developers.trendyol.com/v2.0/docs/webhook-model)
- [Trendyol sipariş paketleri](https://developers.trendyol.com/v2.0/docs/get-order-packages-getshipmentpackages)
- [Trendyol iade/claim sorgusu](https://developers.trendyol.com/v2.0/docs/getting-returned-orders-getclaims)
- [Trendyol fatura dosyası gönderimi](https://developers.trendyol.com/v2.0/docs/send-customer-invoice-file)
- [Shopify B2B şirket ve müşteri modeli](https://help.shopify.com/en/manual/b2b/companies-and-customers)
- [Shopify B2B katalogları](https://help.shopify.com/en/manual/b2b/markets/catalogs)
- [Shopify B2B miktar kuralları ve hacim fiyatı](https://help.shopify.com/en/manual/b2b/catalogs/quantity-pricing)
- [Shopify B2B ödeme vadeleri](https://help.shopify.com/en/manual/b2b/checkout-and-orders/payment-terms)
