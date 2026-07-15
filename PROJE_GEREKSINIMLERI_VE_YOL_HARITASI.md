# TopTan Market Gereksinimleri ve Yol Haritası

Tarih: 15 Temmuz 2026  
Kapsam: Next.js 16, Prisma 5, SQL Server, mağaza, müşteri hesabı, sipariş, stok ve yönetim paneli  
İlişkili rapor: `PROJE_INCELEME_VE_DUZELTME_PLANI.md`

## Bu Dosyanın Amacı

Bu belge, ilk inceleme raporundaki doğrulanmış bulguları değiştirmez. İlk rapor “ne bulundu ve şimdiye kadar ne düzeltildi?” sorusunu, bu belge ise “uygulamanın güvenli biçimde çalışması ve üretime çıkması için bundan sonra ne gerekiyor?” sorusunu yanıtlar.

Durum ifadeleri şu anlamda kullanılır:

- **Tamamlandı:** Kod değişikliği mevcut ve hafif doğrulamadan geçti.
- **Kısmi:** Temel kod mevcut; dış servis, veri geçişi veya uçtan uca doğrulama eksik.
- **Bekliyor:** Henüz uygulanmadı.
- **Karar gerekli:** Uygulamadan önce işletme veya altyapı tercihi gerekiyor.

### 15 Temmuz 2026 uygulama ilerlemesi

- B2B müşteri onayı, askıya alma ve finansal koşul yönetimi uygulama kodunda eklendi.
- `OrderItem`, müşteri-bazlı idempotency ve sipariş tutar snapshot'ları için Prisma şeması, incremental SQL ve uygulama entegrasyonu hazırlandı.
- Ürün detay sayfası, salt-okunur veritabanı sağlık rotası ve PID/RAM korumalı smoke test aracı eklendi.
- README gerçek kurulum, secret, migration ve düşük-RAM çalışma talimatlarıyla yenilendi.
- Bu değişiklikleri etkinleştirecek veritabanı migration'ı uygulanmadı ve Prisma Client yeniden üretilmedi. Önce yedek, incelenmiş baseline ve ayrı test SQL Server doğrulaması zorunludur.

## 1. Mevcut Durumun Özeti

### Hazır olan temel parçalar

- Next.js 16 App Router ve React 19 uygulama iskeleti
- Prisma üzerinden SQL Server veri modeli
- Müşteri ve yönetici girişi için imzalı `HttpOnly` oturum çerezi
- Scrypt parola hash'i ve mevcut düz metin parolalar için kontrollü geçiş aracı
- Admin rol kontrolleri, müşteri veri alanı sınırlandırması ve güvenli upload kontrolleri
- Sunucuda yeniden hesaplanan fiyat, iskonto, stok ve cari risk kontrolleri
- Stok düşümü, cari bakiye ve sipariş oluşturma için `Serializable` transaction
- Ürün/kategori arama, sepet, hızlı sipariş, sipariş takibi ve admin sipariş listesi
- Ürün detay rotası ve ürün kartlarından detay bağlantıları
- B2B başvuru/onay/askıya alma ve `SUPERADMIN` finansal koşul yönetimi kodu
- Sipariş idempotency, başlık tutarları ve değişmez kalem snapshot entegrasyonu
- Ürün görsellerinin vitrin ve sepette gösterilmesi
- Hedefli yardımcı testler, hafif TypeScript sözdizimi kontrolü ve RAM korumalı smoke aracı

### Üretime çıkmayı engelleyen ana eksikler

- Prisma migration tabanı yok; mevcut veritabanı şeması sürümlenemiyor.
- Mevcut hesapların parola rotasyonu/veri geçişi henüz çalıştırılmadı.
- B2B onay ve sıfır-limit düzeltmesi kodda hazır olsa da veritabanı migration/cutover yapılmadığı için henüz etkin değil.
- Sipariş kalem snapshot'ları ve idempotency kodda hazır olsa da veritabanı migration/cutover yapılmadığı için henüz etkin değil.
- Para alanları `Float`; finansal kesinlik için `Decimal` migration'ı gerekiyor.
- Yerel `public/uploads` çoklu sunucu veya serverless dağıtım için kalıcı değil.
- Gerçek ödeme sağlayıcısı ve doğrulanmış webhook akışı yok.
- Sipariş, parola sıfırlama ve stok bildirimleri için e-posta servisi yok.
- Stok rezervasyonu, iptal/iade ve ödeme başarısızlığı sonrası geri alma akışı tamamlanmadı.
- Uçtan uca HTTP, gerçek SQL Server migration, production build ve dağıtım testi yapılmadı.
- README yenilendi; CI/CD, izleme, doğrulanmış yedekleme ve geri dönüş runbook'u hâlâ eksik.

Bu nedenle proje şu anda **geliştirme/ön izleme düzeyindedir; üretim için hazır değildir**.

## 2. Çalışması İçin Zorunlu Gereksinimler

### 2.1 SQL Server ve veritabanı

| Gereksinim | Mevcut durum | Yapılması gereken | Kabul ölçütü |
|---|---|---|---|
| SQL Server örneği | Prisma sağlayıcısı `sqlserver`; bağlantı `.env` üzerinden bekleniyor | Geliştirme, test ve üretim için ayrı veritabanları oluşturmak | Her ortam yalnız kendi veritabanına bağlanıyor |
| `DATABASE_URL` | `.env.example` içinde örnek var | Gerçek kullanıcı/parolayı kaynak koda yazmadan secret store veya sunucu ortam değişkeninde tutmak | Repo ve loglarda bağlantı parolası görünmüyor |
| Yetki ayrımı | Belirsiz | Uygulama kullanıcısına yalnız gereken CRUD yetkilerini; migration kullanıcısına ayrı şema yetkisini vermek | Uygulama hesabı şema silemiyor/değiştiremiyor |
| Migration başlangıcı | Migration dosyası yok | Mevcut şemayı baseline kabul eden ilk Prisma/SQL Server migration'ını üretmek ve incelemek | Boş test veritabanı aynı şemaya migration ile kurulabiliyor |
| Yedekleme | Proje içinde prosedür yok | Migration ve parola geçişinden önce tam yedek; periyodik otomatik yedek; geri yükleme denemesi | Test ortamında yedekten geri dönüş kanıtlanmış |
| Veri bütünlüğü | Bazı ilişkiler ve benzersizlikler eksik | `OrderItem`, waitlist birleşik unique, slug unique ve gerekli indeksleri migration'a eklemek | Tekrarlı kayıtlar ve yetim ilişkiler veritabanı seviyesinde engelleniyor |

Not: `prisma/dev.db`, mevcut `sqlserver` sağlayıcısının çalışma veritabanı değildir. Kullanılmadığı doğrulanmadan silinmemeli; doğrulama sonrasında yanlış kaynak algısı oluşturmaması için temizlenmelidir.

### 2.2 Ortam değişkenleri ve secret yönetimi

Bugün gereken zorunlu değişkenler:

```dotenv
DATABASE_URL="..."
SESSION_SECRET="..."
```

Kurallar:

- `SESSION_SECRET` en az 32 karakterlik, tahmin edilemez ve yalnız ilgili ortama ait bir değer olmalı.
- `.env.example` yalnız anahtar adlarını ve güvenli örnekleri içermeli; `.env` ve gerçek secret'lar Git'e girmemeli.
- Geliştirme, test ve üretim aynı `SESSION_SECRET` değerini paylaşmamalı.
- Secret rotasyonu mevcut tüm oturumları geçersiz kılacağı için bakım penceresinde yapılmalı.
- Üretimde secret'lar hosting sağlayıcısının secret store'u, Windows güvenli ortam değişkeni veya eşdeğer bir kasa üzerinden verilmelidir.
- İleride object storage, ödeme ve e-posta değişkenleri eklendiğinde aynı kurallar uygulanmalıdır.

### 2.3 Mevcut parolaların rotasyonu

Kod tarafı hazırdır; veritabanı geçişi henüz yapılmamıştır. Geçiş için:

1. Veritabanı yedeği alınmalı ve geri yüklenebilir olduğu kontrol edilmeli.
2. Bilinen demo/zayıf parolalara sahip hesaplar için en az 12 karakterlik yeni parolalar belirlenmeli.
3. Yeni parolalar güvenli bir kanaldan hesap sahiplerine ulaştırılmalı; belgeye veya terminal geçmişine açık biçimde yazılmamalı.
4. `PASSWORD_ROTATIONS_JSON` yalnız geçiş süreci için geçici ortam değişkeni olarak verilmeli.
5. `CONFIRM_PASSWORD_MIGRATION=YES` olmadan araç zaten çalışmayı reddeder; onay yalnız yedekten sonra verilmelidir.
6. Geçiş sonrasında düz metin kalan hesap sayısı sıfır olmalı ve eski parolalarla giriş başarısız olmalıdır.
7. Geçici rotasyon değişkenleri işlemden hemen sonra temizlenmelidir.

### 2.4 Kalıcı görsel/object storage

Yerel `public/uploads` yalnız tek makinede geliştirme için uygundur. Üretim için S3 uyumlu storage, Azure Blob, Cloudflare R2 veya seçilen hosting ile uyumlu eşdeğer bir servis gereklidir.

Gerekli çıktı:

- Sunucu tarafında yetkili ve boyutu sınırlandırılmış upload
- Rastgele nesne anahtarı; kullanıcı dosya adının doğrudan kullanılmaması
- JPEG/PNG/WebP içerik doğrulamasının korunması
- Bucket erişim politikası, CORS, yaşam döngüsü ve silme politikası
- Veritabanında kalıcı CDN/nesne URL'si
- Yetkisiz dosya listeleme ve overwrite işlemlerinin engellenmesi
- Eski yerel görseller için kontrollü taşıma aracı

Kabul ölçütü: Uygulama yeniden dağıtıldığında veya ikinci instance açıldığında yüklenmiş görseller kaybolmuyor ve her iki instance tarafından görüntülenebiliyor.

### 2.5 Gerçek ödeme sağlayıcısı

Sağlayıcı seçimi **karar gerektirir**. Kart numarası, CVV veya tam kart verisi uygulama sunucusunda tutulmamalıdır. Sağlayıcının yönlendirmeli ödeme sayfası, token'ı veya barındırılan alanları kullanılmalıdır.

Zorunlu akış:

1. Sipariş `PENDING_PAYMENT` olarak ve benzersiz idempotency anahtarıyla oluşturulur.
2. Tutar sunucuda, saklanan sipariş kalemlerinden hesaplanır.
3. Ödeme oturumu sağlayıcıda sunucu tarafından açılır.
4. Başarı sayfası tek başına ödeme kanıtı sayılmaz.
5. İmzalı webhook doğrulanır; aynı webhook tekrar gelse de ikinci kez tahsilat veya stok hareketi oluşmaz.
6. Başarılı ödeme `PAID`, başarısız/sona eren ödeme uygun hata durumuna geçirilir.
7. İptal/iade sağlayıcı kaydı ile uygulama kaydını birlikte günceller.

Kabul ölçütü: Sağlayıcının sandbox ortamında başarılı, başarısız, iptal, tekrar webhook ve zaman aşımı senaryoları test edilmiştir; uygulama hiçbir aşamada kart verisi kaydetmez.

### 2.6 E-posta servisi

Bir işlem e-postası sağlayıcısı veya SMTP hesabı gereklidir. En az şu mesajlar planlanmalıdır:

- E-posta doğrulama ve parola sıfırlama
- Yeni sipariş alındı
- Ödeme/cari onaylandı veya başarısız oldu
- Sipariş sevk edildi/iptal edildi
- Stok bekleme listesi bildirimi
- Yönetici için kritik stok ve sistem hata uyarısı

Üretim gereksinimleri:

- Gönderici alan adı, SPF, DKIM ve mümkünse DMARC
- Şablonlarda sipariş verisini yalnız yetkili alıcıya gösterme
- Tek kullanımlık ve süreli parola sıfırlama token'ı
- Gönderim kuyruğu, tekrar deneme ve başarısız gönderim kaydı
- Sağlayıcı anahtarlarının yalnız sunucuda tutulması

Kabul ölçütü: Test ortamında gerçek teslimat, bounce ve tekrar deneme senaryosu görülmüş; parola sıfırlama bağlantısı kullanıldıktan sonra yeniden kullanılamamıştır.

### 2.7 B2B müşteri onayı ve finansal yetkilendirme

Mevcut açık kayıt akışı müşteri kaydını hemen oluşturup oturum açıyor. `Customer.riskLimit` model varsayılanı `500000.0` olduğu için henüz ticari doğrulaması yapılmamış bir hesap 500.000 TL risk limitiyle doğuyor. Bu bir B2B uygulamasında üretimi engelleyen finansal yetkilendirme açığıdır.

Zorunlu model ve akış:

- Müşteri durum alanı en az `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED` ve `REJECTED` değerlerini taşımalı.
- Açık kayıttan gelen müşteri `PENDING_APPROVAL`, `riskLimit = 0`, `discountRate = 0` ve `balance = 0` ile oluşturulmalı.
- Bekleyen hesap oturum açsa bile yalnız başvuru durumunu görebilmeli; bayi fiyatı, cari bakiye/risk ve sipariş işlemlerine erişememeli.
- Yalnız yetkili admin müşteriyi onaylayabilmeli; onay sırasında benzersiz `companyCode`, plasiyer, risk limiti ve iskonto açıkça atanmalı.
- Risk ve iskonto için alt/üst sınır, para birimi ve kim tarafından değiştirilebileceği belirlenmeli.
- `SUSPENDED` veya `REJECTED` hesap mevcut oturumu olsa dahi sunucu tarafında tüm korumalı müşteri işlemlerinden reddedilmeli.
- Onay, askıya alma, yeniden etkinleştirme ve finansal alan değişiklikleri audit log bırakmalı.
- Durum değişikliği müşteriye e-posta ile bildirilmeli; ret/askıya alma gerekçesinin müşteriye gösterilecek güvenli bir özeti olmalı.
- Mevcut müşteriler migration sırasında otomatik `ACTIVE` yapılmadan önce gerçek/demo ayrımı ve finansal değerleri işletme tarafından doğrulanmalı.

Kabul ölçütü: Yeni kayıtla doğrudan sipariş verilemez; hesap `riskLimit = 0` ve `PENDING_APPROVAL` başlar. Yetkili admin `companyCode`, plasiyer, risk ve iskonto atayıp onayladıktan sonra erişim açılır. Hesap `SUSPENDED` yapıldığı anda eski oturumu dahil ürün fiyatı/cari/sipariş sınırlarında sunucudan reddedilir.

### 2.8 Üretim altyapısı

- Alan adı ve HTTPS sertifikası
- Next.js 16 ile uyumlu Node.js sürümü ve süreç yöneticisi/container
- Reverse proxy üzerinde istek gövdesi, timeout ve güvenlik başlıkları
- Uygulama/DB/object storage için ayrı üretim kimlikleri
- Merkezi log, hata takibi ve temel metrikler
- Sağlık kontrolü, yedekleme, geri dönüş ve bakım prosedürü
- Ödeme webhook'u ve e-posta sağlayıcısı için erişilebilir üretim URL'leri

## 3. Karar Verilmesi Gereken Konular

| Karar | Seçenek örnekleri | Neyi etkiler |
|---|---|---|
| Hosting modeli | Windows sunucu/IIS reverse proxy, container/VPS, yönetilen platform | Deploy, dosya sistemi, log, ölçekleme |
| SQL Server konumu | Aynı ağdaki sunucu, yönetilen SQL, ayrı DB sunucusu | Bağlantı, TLS, yedek, gecikme |
| Object storage | S3 uyumlu, Azure Blob, R2 | Upload kodu, CDN ve maliyet |
| Ödeme sağlayıcısı | İşletmenin sözleşmeli sağlayıcısı | Checkout, webhook, iade, komisyon |
| E-posta sağlayıcısı | Kurumsal SMTP veya işlem e-postası servisi | Teslimat, şablon, bounce takibi |
| Müşteri kabulü | Açık kayıt veya admin onaylı bayi kaydı | Kayıt, fiyat/risk görünürlüğü, güvenlik |
| Kargo modeli | Manuel, kargo API'si veya ERP üzerinden | Adres, takip numarası, durum akışı |
| Fatura/ERP entegrasyonu | Manuel, mevcut muhasebe/ERP API'si | Ürün, stok, cari ve sipariş kaynak otoritesi |
| Stok kaynağı | Bu uygulama veya ERP/depo sistemi | Rezervasyon, senkronizasyon ve mutabakat |

Bu seçimler netleşmeden ödeme, object storage, e-posta ve ERP entegrasyon kodu kalıcı biçimde tamamlanmamalıdır.

## 4. Öncelikli Backlog

### P0 — Üretimi Engelleyen Güvenlik ve Veri Bütünlüğü

| Kod | İş | Neden | Beklenen çıktı | Bağımlılık | Kabul kriteri |
|---|---|---|---|---|---|
| DB-001 | SQL Server baseline migration | Şema değişiklikleri bugün tekrarlanabilir değil | İncelenmiş ilk migration ve migration çalışma talimatı | DB yedeği, test DB | Boş test DB tek komut akışıyla aynı şemaya kuruluyor; mevcut DB veri kaybetmeden baseline'a bağlanıyor |
| SEC-007 | Mevcut parolaları döndürmek ve hash'lemek | Kod yeni parolaları korusa da mevcut düz metin kayıtlar risk oluşturuyor | Kontrollü rotasyon kaydı ve sıfır legacy parola | DB-001 öncesi/sonrası yedek, yeni parolalar | Düz metin hesap yok; eski parola reddediliyor; yeni parola çalışıyor |
| ORD-001 | `OrderItem` snapshot modeli | Siparişin hangi ürünlerden oluştuğu kanıtlanamıyor | Ürün kodu/adı, birim, çarpan, adet, birim fiyat, iskonto, vergi ve satır toplamı snapshot'ı | DB-001, işletme vergi kararı | Sipariş ürün/fiyat değişse bile tarihsel kalemleri aynı gösteriyor |
| ORD-002 | Finansal alanları `Decimal` yapmak | `Float` kuruş ve limit hesaplarında hata üretebilir | Fiyat, bakiye, risk ve toplamlar için uygun precision/scale | DB-001, veri dönüşüm planı | Örnek sınır değerlerinde kuruş farkı yok; eski toplamlar mutabık |
| ORD-003 | Idempotency ve stok rezervasyonu | Tekrar istek, ödeme zaman aşımı ve iptal stok/bakiye tutarsızlığı yaratabilir | Benzersiz istek anahtarı, rezervasyon süresi, serbest bırakma ve mutabakat işi | ORD-001/002, ödeme durum modeli | Aynı istek/webhook iki kez işlendiğinde tek sipariş ve tek stok hareketi var |
| B2B-001 | Bayi onayı ve hesap durum sınırı | Açık kayıt bugün hesabı otomatik oturumla ve varsayılan 500.000 risk limitiyle oluşturuyor | `PENDING_APPROVAL/ACTIVE/SUSPENDED/REJECTED`, kayıt anında risk/iskonto 0, admin onayı ve audit | DB-001, rol matrisi, işletme onay kuralı | Yeni kayıt sipariş veremiyor; yalnız admin companyCode/plasiyer/risk/iskonto atayarak açıyor; suspended hesap eski oturumla da reddediliyor |
| PAY-001 | Gerçek ödeme + imzalı webhook | Kartlı sipariş bugün yalnız `PENDING_PAYMENT` | Sandbox ödeme, webhook doğrulama, hata/iade durumları | Sağlayıcı kararı, ORD-001/003, HTTPS | Başarı/başarısızlık/tekrar webhook testleri geçiyor; kart verisi uygulamaya gelmiyor |
| STO-001 | Upload'ı object storage'a taşımak | Yerel dosya deploy ve çoklu instance'ta kaybolur | Provider adapter'ı, güvenli upload ve eski dosya taşıma planı | Storage kararı ve bucket | Yeniden deploy sonrası görseller erişilebilir; yetkisiz upload/listeme engelli |
| OPS-001 | Yedek, geri yükleme ve rollback | Migration veya veri geçişi geri alınamıyor | Yazılı runbook, otomatik yedek ve doğrulanmış restore | SQL Server yetkisi ve depolama | Test restore tamamlanmış; migration geri dönüş adımı belgeli |
| SEC-008 | Dağıtık rate limit ve güvenlik başlıkları | Bellek içi rate limit çoklu instance'ta ortak çalışmaz | Paylaşımlı rate-limit store, CSP/HSTS ve proxy başlıkları | Hosting/Redis benzeri store kararı | İki instance toplam limite uyar; temel güvenlik başlıkları HTTP testinde görülür |

### P1 — Sipariş, Operasyon ve B2B İş Akışı

| Kod | İş | Neden | Beklenen çıktı | Bağımlılık | Kabul kriteri |
|---|---|---|---|---|---|
| ORD-004 | Sipariş durum makinesi | Serbest metin durumlar geçersiz geçişlere açıktır | İzinli durumlar ve rol bazlı geçiş tablosu | ORD-001/003, işletme süreci | Örneğin iptal edilen sipariş doğrudan sevk edildi yapılamıyor |
| INV-001 | Stok hareket defteri ve mutabakat | Yalnız toplam stok adedi neden değiştiğini göstermez | Giriş, satış, rezervasyon, iptal, iade ve düzeltme hareketleri | ORD-001/003, stok kaynağı kararı | Her stok değişimi kaynak belgeye bağlı; toplam hareketler mevcut stokla eşleşiyor |
| WAIT-001 | Bekleme listesi birleşik unique ve bildirim | Aynı müşteri aynı ürüne tekrar yazılabilir | `(customerId, productId)` unique ve stok gelince kuyruklu bildirim | DB-001, MAIL-001 | Tek kayıt oluşuyor; stok geldiğinde bir bildirim üretiliyor |
| MAIL-001 | İşlem e-postaları | Kullanıcı sipariş/ödeme/parola olaylarından haberdar olmuyor | Sağlayıcı adapter'ı, şablon, kuyruk ve gönderim kaydı | E-posta sağlayıcısı, alan adı | Sipariş ve parola sıfırlama e-postaları test teslimatında doğrulandı |
| ADR-001 | Teslimat ve fatura adresleri | Siparişin nereye gideceği kalıcı tutulmuyor | Adres modelleri ve siparişte değişmez adres snapshot'ı | ORD-001, KVKK alan kararı | Sipariş sonrası müşteri adresi değişse de eski sipariş adresi korunuyor |
| SHIP-001 | Kargo/sevkiyat akışı | Takip numarası ve sevk durumu yok | Kargo firması, takip numarası, paket ve sevk olayları | ADR-001, kargo kararı | Müşteri yalnız kendi takip bilgisini görüyor; durum geçişleri kayıtlı |
| CAT-002 | Kalıcı kategori slug alanı | Geçici isimden slug üretimi yeniden adlandırmada rota kırabilir | Unique slug, parent-child doğrulama ve eski URL yönlendirmesi | DB-001 | Türkçe ad değişse de mevcut URL çalışıyor veya 301 yönleniyor |
| AUD-001 | Yönetici denetim kaydı | Kritik ürün, stok, müşteri ve sipariş değişikliklerinin sahibi bilinmiyor | Aktör, eylem, hedef, önce/sonra özeti, zaman ve request kimliği | Oturum sistemi, veri saklama kararı | Kritik admin işlemleri sorgulanabilir ve değiştirilemez kayıt bırakıyor |
| ERP-001 | ERP/muhasebe sınırını tanımlamak | Ürün, stok, cari ve fatura için iki kaynak veri çakışabilir | Kaynak otoritesi, senkron yönü, hata kuyruğu ve mutabakat raporu | ERP ve stok kaynağı kararı | Aynı kaydın sahibi belli; senkron hatası yeniden işlenebiliyor |

### P2 — Ürün Deneyimi ve İşlevsel Tamamlama

| Kod | İş | Neden | Beklenen çıktı | Bağımlılık | Kabul kriteri |
|---|---|---|---|---|---|
| PRD-001 | Ürün detay sayfası | Kart görünümü teknik ve ticari bilgileri taşımaya yetmiyor | Görsel galerisi, birimler, fiyat, stok, açıklama ve ilgili ürünler | STO-001, CAT-002 | Ürün kartından detay sayfasına gidiliyor; olmayan ürün 404 veriyor |
| FAV-001 | Kalıcı favoriler | Favori durumu yalnız bileşen state'inde kayboluyor | Müşteri-favori modeli ve yetkili API/action | DB-001, oturum | Çıkış/giriş ve farklı cihaz sonrasında favoriler korunuyor |
| SRCH-001 | Arama, filtre, sıralama ve sayfalama | İlk 20 sonuç dışında keşif sınırlı | Sunucu sayfalama, kategori/stock/fiyat filtresi ve güvenli sorgu | Katalog veri kalitesi | Sonuç sayısı ve sayfa geçişleri doğru; büyük katalogda sabit bellek kullanıyor |
| PRC-001 | Kampanya ve fiyat kuralı modeli | Kampanyalar sayfası gerçek fiyat kuralına bağlı değil | Tarihli kampanya, müşteri grubu, öncelik ve çakışma kuralı | ORD-001/002 | Checkout ile vitrin aynı geçerli fiyatı gösteriyor |
| CNT-001 | İçerik sayfalarını gerçek metinlerle tamamlamak | SSS, iade, gizlilik ve banka bilgileri placeholder düzeyinde | Onaylı hukuki/işletme içeriği ve sürüm tarihi | İşletme ve hukuk onayı | Footer'daki tüm bağlantılar güncel ve boş olmayan sayfalara açılıyor |
| MOB-001 | Mobil/responsive düzen | Sepet, checkout, hızlı sipariş ve admin küçük ekranda zor kullanılıyor | 360/768/1024 px düzenleri ve taşma düzeltmeleri | Temel akışların sabitlenmesi | Kritik akışlarda yatay taşma yok; buton ve formlar kullanılabilir |
| A11Y-001 | Erişilebilirlik | İkon, form, slider, odak ve kontrast eksikleri var | Semantik etiketler, klavye akışı, focus state ve canlı hata mesajları | MOB-001 | Klavye ile sipariş tamamlanabiliyor; otomatik taramada kritik hata yok |
| RPT-001 | Gerçek satış/stok raporları | Dashboard demo siparişlerden besleniyor | Tarih/şube/plasiyer filtreleri ve demo veriyi ayıran rapor | ORD-001, ERP-001 | Rapor toplamı SQL mutabakat sorgusuyla eşleşiyor |

### P3 — Kalite, Bakım ve Ölçeklenebilirlik

| Kod | İş | Neden | Beklenen çıktı | Bağımlılık | Kabul kriteri |
|---|---|---|---|---|---|
| QA-001 | Mevcut lint borcunu kapatmak | İlk taramada 26 hata ve 14 uyarı vardı | Sıfır hata; uyarılar bilinçli istisna veya düzeltilmiş | Kod akışlarının sabitlenmesi | Hedefli lint ve ardından CI lint başarılı |
| QA-002 | Test katmanları | Yalnız güvenlik yardımcı testleri var | Unit, veri erişimi, route/action entegrasyonu ve kritik E2E testleri | Test SQL Server ve fixture stratejisi | Login, yetki, sipariş, stok yarışı ve webhook kritik senaryoları CI'da geçiyor |
| CI-001 | CI/CD | Kontroller kişisel makineye bağlı | Syntax, lint, typecheck, test, migration kontrolü ve güvenli deploy pipeline'ı | Git dal/PR düzeni, hosting | Hatalı kontrol deploy'u durduruyor; production deploy kayıtlı ve geri alınabilir |
| DOC-001 | README ve runbook | README hâlâ varsayılan Create Next App metni | Kurulum, env, DB, seed, test, deploy, yedek ve olay müdahale rehberi | Nihai altyapı kararları | Yeni geliştirici yalnız dokümanla test ortamını kurabiliyor |
| OBS-001 | Log, metrik ve alarm | Üretim hataları ve yavaşlık görünmez | Yapısal log, request ID, hata takibi, DB/HTTP metrikleri ve alarm | Hosting seçimi | Kritik hata alarmı test edilip alıcıya ulaşıyor; loglarda secret yok |
| DEP-001 | Bağımlılık temizliği ve güncelleme politikası | Kullanılmayan `next-auth` ve sürüm drift'i bakım yükü yaratır | Kullanılmayan paketlerin kaldırılması, kilit dosyası ve kontrollü güncelleme takvimi | Kimlik doğrulama mimarisi kararı | Kullanılmayan runtime paket yok; güncelleme PR'ları testlerden geçiyor |
| PERF-001 | Performans ve sorgu bütçesi | Katalog ve rapor büyüdükçe sınırsız sorgular pahalılaşır | Sayfalama, indeks, sorgu süresi ölçümü, cache ve görsel optimizasyonu | Gerçek veri hacmi | Tanımlı katalog hacminde p95 hedefi sağlanıyor ve bellek sürekli artmıyor |
| LEG-001 | KVKK, gizlilik ve veri saklama | Müşteri/vergi/adres verisi kişisel ve ticari veri içerir | Aydınlatma, saklama/silme politikası, erişim kaydı ve veri talebi akışı | Hukuk/işletme kararı | Saklama süresi ve silme prosedürü uygulanabilir biçimde belgeli |
| GIT-001 | Temiz Git başlangıç noktası | Projenin çoğu ilk commit dışında izlenmiyor | İncelenmiş kapsamla anlamlı commit/PR geçmişi | Mevcut kullanıcı değişikliklerinin ayrıştırılması | Secret ve çıktı dosyaları hariç gerekli kaynaklar izleniyor; çalışma ağacı açıklanabilir |

## 5. Önerilen Uygulama Fazları

### Faz 0 — Kararlar ve güvenli başlangıç

1. Hosting, SQL Server, object storage, ödeme, e-posta, kargo ve ERP kararlarını kaydet.
2. Mevcut veritabanının tam yedeğini al ve test restore yap.
3. Gerçek secret'ların repo dışında tutulduğunu doğrula.
4. Demo/gerçek veriyi ayır; üretimde kullanılmayacak hesap ve siparişleri işaretle.

Çıkış ölçütü: Altyapı sahipleri, erişimler ve geri dönüş yolu belli.

### Faz 1 — Veri modeli ve hesap güvenliği

1. Baseline migration oluştur ve boş test SQL Server'da doğrula.
2. `Decimal`, `OrderItem`, unique constraint, slug ve gerekli indeks migration'larını hazırla.
3. Müşteri durum alanını ekle; açık kaydı risk/iskonto 0 olan `PENDING_APPROVAL` akışına taşı.
4. Admin onayı, `companyCode`/plasiyer/risk/iskonto ataması ve suspended hesap sınırını uygula.
5. Test verisiyle dönüşüm/mutabakat raporu üret.
6. Yedek sonrasında mevcut parolaları döndür ve hash geçişini doğrula.

Çıkış ölçütü: Migration tekrarlanabilir; legacy parola yok; onaysız/askıdaki hesap finansal işlem yapamıyor; finansal veri mutabık.

### Faz 2 — Sipariş, stok ve ödeme çekirdeği

1. Sipariş kalemlerini snapshot olarak yaz.
2. Idempotency, stok rezervasyonu ve durum makinesini uygula.
3. Ödeme sandbox ve imzalı webhook entegrasyonunu tamamla.
4. Başarısız ödeme, iptal ve iade sonrası stok/bakiye geri alma testlerini yap.

Çıkış ölçütü: Aynı isteğin tekrarı çift kayıt üretmiyor; ödeme ve stok mutabık.

### Faz 3 — Operasyonel servisler

1. Upload'ı object storage'a taşı.
2. E-posta şablonları, kuyruk ve parola sıfırlamayı ekle.
3. Adres, sevkiyat, bekleme listesi ve audit log akışlarını tamamla.
4. ERP/kargo varsa sandbox entegrasyonunu ekle.

Çıkış ölçütü: Deploy sonrası dosyalar kalıcı; operasyon olayları izlenebilir ve bildirilebilir.

### Faz 4 — Mağaza ve yönetim deneyimi

1. Ürün detay, favori, gelişmiş arama ve kampanya fiyatlarını tamamla.
2. Mobil düzen ve erişilebilirlik düzeltmelerini uygula.
3. Hukuki/içerik sayfalarını onaylı metinlerle doldur.
4. Demo dashboard yerine mutabık raporlama oluştur.

Çıkış ölçütü: Müşteri ve admin kritik görevleri masaüstü/mobilde tamamlayabiliyor.

### Faz 5 — Üretim hazırlığı

1. Lint/typecheck/test borcunu kapat ve CI'a bağla.
2. Production benzeri staging ortamında migration ve smoke test yap.
3. İzleme, alarm, yedek, rollback ve olay müdahale tatbikatı yap.
4. Kısıtlı pilot müşteri grubuyla kontrollü açılış yap.

Çıkış ölçütü: Dağıtım, geri dönüş ve iş kritik senaryolar kanıtlı.

## 6. İlk Uygulanacak Teknik Paket

Bir sonraki kod paketi şu sırayla ve ayrı, geri alınabilir adımlarla hazırlanmalıdır:

1. `OrderItem` ve finansal `Decimal` şema taslağı
2. Mevcut veriyi bozmayan SQL Server migration ve veri dönüşüm planı
3. `createOrder` içinde snapshot kalemleri ve idempotency kullanımı
4. Waitlist unique ve kategori slug migration'ı
5. Sipariş/stok yarış koşulu için hedefli testler
6. Migration öncesi ve sonrası mutabakat sorguları

Bu paket sırasında canlı veritabanına migration uygulanmamalı; önce test veritabanı, yedek ve kullanıcı onayı gereklidir.

## 7. Test Kontrol Listesi

### Hızlı ve düşük kaynaklı kontroller

- [x] Başlangıçta kullanılabilir RAM ve çalışan `node.exe` süreçleri kaydedildi.
- [x] Kontroller aynı anda yalnız tek hedefli süreç olacak biçimde sırayla çalıştırıldı.
- [x] Kaynak sözdizimi kontrolü 66/66 geçti.
- [x] Hedefli yardımcı testler 13/13 geçti.
- [x] Prisma şeması veri yazmadan doğrulandı.
- [ ] Değişen dosyalara hedefli lint/type kontrolü uygulandı.
- [x] Kontrol sonrasında RAM ve Node süreçleri tekrar kaydedildi.
- [x] Yalnız bu çalışma için başlatılan süreç PID'leri kapatıldı.

### Kimlik doğrulama ve yetki

- [ ] Geçerli/geçersiz müşteri ve admin girişi
- [x] Süresi geçmiş ve kurcalanmış oturum çerezi yardımcı testte reddedildi.
- [ ] Her admin rolü için izin verilen/yasak işlem
- [ ] Müşteri API yanıtlarında `password` ve gereksiz hassas alan bulunmaması
- [ ] Logout sonrasında çerezin geçersizleşmesi
- [x] Login rate limit yardımcı davranışı doğrulandı; register HTTP limit testi hâlâ bekliyor.
- [ ] Yeni kayıt `PENDING_APPROVAL`, `riskLimit = 0` ve `discountRate = 0` oluşuyor.
- [ ] Bekleyen hesap fiyat/cari/sipariş işlemlerinden sunucu tarafında reddediliyor.
- [ ] Admin onayı companyCode, plasiyer, risk ve iskonto atanmadan tamamlanmıyor.
- [ ] `SUSPENDED` hesap daha önce açılmış oturumla da korumalı işlemlere erişemiyor.
- [ ] Müşteri onay/askıya alma ve finansal alan değişikliği audit log bırakıyor.

### Sipariş, ödeme ve stok

- [ ] Fiyat/iskonto/çarpan istemcide değiştirilse bile sunucu değerinin kullanılması
- [ ] Aynı ürünün birden fazla satırda doğru gruplanması
- [ ] Yetersiz stokta hiçbir bakiye/sipariş/stok değişikliği kalmaması
- [ ] Eşzamanlı son stok siparişlerinden yalnız birinin başarılı olması
- [ ] Cari risk limitinin atomik uygulanması
- [ ] Aynı idempotency anahtarının tek sipariş üretmesi
- [ ] Tekrarlanan webhook'un tek ödeme hareketi üretmesi
- [ ] Başarısız/iptal ödeme sonrası rezervasyonun bırakılması
- [ ] Para hesaplarının `Decimal` ile kuruş seviyesinde mutabık olması

### Upload ve e-posta

- [ ] Yetkisiz upload reddediliyor.
- [ ] Fazla boyut, yanlış MIME ve sahte dosya imzası reddediliyor.
- [ ] Deploy/ikinci instance sonrasında görsel erişiliyor.
- [ ] E-posta şablonunda başka müşterinin verisi görünmüyor.
- [ ] Parola sıfırlama token'ı süreli ve tek kullanımlık.
- [ ] E-posta gönderim hatası kuyrukta tekrar deneniyor.

### Kritik kullanıcı smoke testi

- [x] Ana sayfa ve kategoriler kontrollü HTTP smoke testinde açıldı.
- [ ] Arama sonuç veriyor.
- [ ] Müşteri giriş yapıp sepete ürün ekliyor.
- [ ] Stoklu sipariş oluşturuluyor ve takip ekranında görünüyor.
- [ ] Admin rolüne uygun ekranları görüyor.
- [x] Yetkisiz admin sayfası HTTP smoke testinde `/giris` rotasına yönlendirildi; tüm admin API matrisi hâlâ bekliyor.
- [ ] Upload edilen görsel ürün kartında görünüyor.
- [ ] Çıkış yapıldığında korumalı ekranlara erişilemiyor.

## 8. Dağıtım Kontrol Listesi

### Dağıtımdan önce

- [ ] Onaylı commit/PR ve değişiklik listesi hazır.
- [ ] Production secret'ları secret store'da; repoda gerçek secret yok.
- [ ] SQL Server tam yedeği alındı ve restore testi güncel.
- [ ] Migration SQL'i ikinci kişi tarafından incelendi.
- [ ] Staging migration ve veri mutabakatı geçti.
- [ ] Object storage bucket, CORS ve erişim politikası hazır.
- [ ] Ödeme webhook secret'ı ve HTTPS callback URL'si hazır.
- [ ] E-posta alan adı SPF/DKIM ayarları doğrulandı.
- [ ] Reverse proxy istek boyutu, timeout ve güvenlik başlıkları ayarlı.
- [ ] Rollback sürümü, DB geri dönüş kararı ve sorumlu kişi belli.

### Dağıtım sırasında

- [ ] Bakım/geri dönüş penceresi açıldı.
- [ ] Migration yalnız bir kez ve kayıt altına alınarak çalıştırıldı.
- [ ] Uygulama sürümü ile migration sürümü eşleşiyor.
- [ ] Sağlık kontrolü, login ve read-only katalog smoke testi geçti.
- [ ] Kontrollü bir test siparişi ve ödeme sandbox/üretim düşük tutar testi geçti.
- [ ] Loglarda secret, parola, kart verisi veya bağlantı dizesi görünmüyor.

### Dağıtımdan sonra

- [ ] Hata oranı, bellek, CPU, DB bağlantısı ve yanıt süresi izlendi.
- [ ] Sipariş, ödeme, stok ve cari toplamları mutabık.
- [ ] Webhook ve e-posta teslimatları gözlendi.
- [ ] Upload edilen yeni görsel ikinci istek/instance üzerinden açılıyor.
- [ ] Eski sürüme geri dönüş prosedürü gerekmeden sistem stabil kaldı veya rollback uygulandı.
- [ ] Değişiklik ve sonuçlar proje raporuna işlendi.

## 9. 16 GB RAM İçin RAM-Dostu Çalışma Politikası

Windows'un “kullanılabilir RAM” değeri boş görünen bellekten daha anlamlıdır; dosya önbelleği gerektiğinde serbest bırakılabilir. Yine de proje testi başlamadan önce kullanılabilir fiziksel bellek mutlaka ölçülmelidir.

### Başlatma eşikleri

- **4 GB'den az kullanılabilir RAM:** Hiçbir Next.js süreci başlatılmaz.
- **4–8 GB kullanılabilir RAM:** İnteraktif dev sunucusu, build ve tam typecheck yoktur. Yalnız `test:smoke:low-memory` ile 512 MB heap ve 1.300 MB süreç-ağacı sınırı bulunan kısa HTTP kontrolü çalıştırılabilir.
- **8 GB veya üzeri kullanılabilir RAM:** Önce hafif kontroller; gerçekten gerekirse tek Webpack dev süreci kısa süreli ve izlenerek açılabilir.
- **Durdurma sınırı:** Kontrollü smoke sırasında kullanılabilir RAM 2,5 GB altına iner veya proje Node süreç ağacı 1.300 MB'yi aşarsa süreç hemen kapatılır. Sınırsız manuel dev çalışmasında daha geniş eşikler güvenli kabul edilmez.

### Çalışma kuralları

1. Aynı anda `next dev`, `next build`, tam `tsc`, tam lint ve test çalıştırılmaz.
2. Önce statik dosya incelemesi ve hedefli testler yapılır; dev sunucusu son doğrulama için saklanır.
3. Başlatılan ana süreç ve çocuk PID'leri kaydedilir; iş bitince yalnız bu projeye ait kaydedilmiş süreçler kapatılır.
4. Çalışan başka Node uygulamaları topluca kapatılmaz.
5. Her adımın öncesi/sonrası kullanılabilir RAM ve proje Node toplamı kaydedilir.
6. İlk dev sunucusu denemesi kısa tutulur; yalnız kritik rotalar istenir, tüm siteyi paralel ısıtma yapılmaz.
7. Production build mümkünse ayrı CI makinesinde yapılır. Yerelde zorunluysa tek başına, yeterli RAM varken ve izlenerek çalıştırılır.
8. Testler dosya veya özellik bazında sırayla çalıştırılır; paralel worker sayısı artırılmaz.
9. SQL Server migration/test işlemleri de Next build ile aynı anda çalıştırılmaz.
10. Bellek artışı durmuyorsa aynı komut tekrar tekrar denenmez; önce süreç ağacı ve log incelenir.

### Son çalıştırma sırası

1. Kullanılabilir RAM, pagefile durumu ve çalışan Node süreçlerini ölç.
2. Kullanıcıya başlangıç değerini bildir.
3. Hafif sözdizimi kontrolünü tek süreç olarak çalıştır; bitince RAM'i tekrar ölç.
4. Hedefli güvenlik/özellik testini tek süreç olarak çalıştır; bitince RAM'i tekrar ölç.
5. Eşikler uygunsa tek sunucu süreci aç; ana sayfa, login, kategori, sepet ve korumalı admin rotasını sırayla smoke test et.
6. Sunucuyu ve yalnız ona ait çocuk süreçleri kapat.
7. Son RAM/Node ölçümünü yap ve kullanıcıya başlangıç, tepe ve bitiş değerlerini raporla.

Bu politika, daha önce dört Next.js/Turbopack Node işçisinin toplamda yaklaşık 8 GB RAM kullanması nedeniyle zorunlu kabul edilmelidir.

## 10. Tamamlanma Tanımı

Proje ancak aşağıdaki şartların tamamı sağlandığında “üretime hazır” sayılmalıdır:

- Migration ile kurulabilen ve yedekten geri dönebilen SQL Server şeması
- Düz metin parola bulunmaması ve production secret'ların güvenli yönetimi
- Açık kaydın `PENDING_APPROVAL` ve sıfır finansal yetkiyle başlaması; aktif/askıdaki hesap sınırlarının her sunucu işleminde uygulanması
- `OrderItem`, `Decimal`, idempotency, stok rezervasyonu ve doğrulanmış sipariş durumları
- Kalıcı object storage
- Sandbox ve production doğrulaması yapılmış ödeme webhook akışı
- Parola/sipariş bildirimleri için doğrulanmış e-posta servisi
- Kritik akışları kapsayan entegrasyon/E2E testleri
- Sıfır kritik lint/type/test hatası
- HTTPS, güvenlik başlıkları, merkezi log, alarm, yedek ve rollback
- Mobil ve temel erişilebilirlik kabul kriterleri
- İşletme tarafından onaylanmış iade, gizlilik, ödeme, teslimat ve bayi politikaları

## 11. Güncelleme Kuralı

Her uygulama paketinden sonra:

1. Bu dosyadaki ilgili backlog maddesinin durumu güncellenir.
2. `PROJE_INCELEME_VE_DUZELTME_PLANI.md` değişiklik günlüğüne doğrulanmış sonuç eklenir.
3. Çalıştırılan komut, test sonucu ve atlanan doğrulama açıkça yazılır.
4. Veritabanı veya dış servis değiştirilmişse yedek/rollback kanıtı kaydedilir.
5. “Tamamlandı” yalnız kabul kriterleri gerçekten geçtiğinde kullanılır.
