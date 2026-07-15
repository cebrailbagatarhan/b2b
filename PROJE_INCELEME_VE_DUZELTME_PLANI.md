# TopTan Market Proje İnceleme ve Düzeltme Planı

Tarih: 15 Temmuz 2026  
Kapsam: Next.js 16 uygulaması, Prisma/SQL Server veri modeli, mağaza, sepet, sipariş ve yönetim paneli  
Durum: İnceleme tamamlandı, ilk güvenlik ve işlev düzeltme paketi uygulandı

## Kaynak Kullanımı Notu

İnceleme sırasında `next dev` ile açılan Next.js 16 Turbopack geliştirme sunucusu dört Node işçisi oluşturdu. Birden fazla rota derlenirken toplam bellek kullanımı yaklaşık 8 GB seviyesine çıktı. Bu süreçlerin tamamı kapatıldı. Bundan sonraki çalışmalarda ağır geliştirme sunucusu, tam build ve tam typecheck kullanıcı onayı olmadan çalıştırılmayacak; doğrulamalar hedefli ve tek süreçli yapılacak.

İlk paket tesliminde çalışan proje, test veya Next.js Node süreci bırakılmamıştı. 15 Temmuz 2026 admin giriş düzeltmesinden sonra, kullanıcının açık bırakma isteğiyle `127.0.0.1:3100` üzerinde tek Webpack geliştirme sunucusu 768 MB Node heap sınırıyla bilinçli olarak açık bırakıldı. Son giriş-geçmiş düzeltmesi sırasında geliştirme sunucusu kendi bellek eşiğinde bir kez otomatik yeniden başladı; final ölçümünde dinleyici süreç 833,9 MB çalışma kümesi kullanırken 4,17 GB fiziksel RAM boştu.

## Projenin Mevcut Kabiliyetleri

- Next.js 16 App Router ve React 19 tabanı
- Prisma üzerinden SQL Server bağlantısı
- Müşteri, admin, kategori, ürün, fiyat, birim, stok, sepet, sipariş, afiş ve bekleme listesi modelleri
- Ürün arama ve kategori listeleme
- Bayiye özel iskonto ve cari risk limiti
- Yerel tarayıcı sepeti ve hızlı stok kodu siparişi
- Admin dashboard, müşteri listesi, ürün ve afiş yönetimi
- Basit satış tahmini ve kritik stok görünümü

## Doğrulanmış Veritabanı Görünümü

- Ürün: 8
- Kategori: 9
- Müşteri: 1
- Admin: 1
- Sipariş: 25
- Afiş: 1
- Stokta ürün: 0
- Görselli ürün: 0
- Veritabanı sepeti/sepet kalemi: 0/0
- Siparişlerin tamamı `PAID`; toplam görünen tutar 972.531 TL

Bu sipariş yapısı `scripts/mock-sales.ts` tarafından üretilen demo veriyle uyumludur; dashboard rakamları gerçek satış verisi olarak değerlendirilmemelidir.

## P0 - Güvenlik ve Veri Bütünlüğü

### SEC-001 - Müşteri API'si parola ve finansal alanları açığa çıkarıyor

- Durum: Kod düzeltildi; tam HTTP entegrasyon testi bekliyor
- Kanıt: `src/app/api/admin/customers/route.ts` tüm `Customer` satırını seçimsiz döndürüyor.
- Etki: `password`, `taxId`, bakiye, iskonto ve risk limiti yetkisiz kişilere dönebilir.
- Hedef:
  - Sunucu tarafı oturum doğrulaması
  - Admin rol kontrolü
  - Açık DTO/select listesi
  - Parolanın hiçbir API yanıtında bulunmaması

### SEC-002 - Şifreler düz metin saklanıyor

- Durum: Kısmen düzeltildi; yeni kayıtlar ve seed hash'li, mevcut veri geçişi henüz çalıştırılmadı
- Kanıt: `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `prisma/seed.ts`
- Hedef:
  - Güçlü parola hash'i
  - Mevcut demo hesaplar için kontrollü geçiş
  - Tek tip “geçersiz kimlik bilgisi” yanıtı

### SEC-003 - Admin yetkisi istemci localStorage verisine dayanıyor

- Durum: Kod düzeltildi; oturum imza testleri geçti
- Kanıt: `src/lib/store.ts`, `src/app/admin/layout.tsx`
- Etki: UI rolü değiştirilebilir; Server Action ve Route Handler sınırları korunmuyor.
- Hedef:
  - HttpOnly, SameSite imzalı oturum cookie'si
  - Veri kaynağına yakın merkezi `requireAdmin`/`requireSession` kontrolleri
  - Client store'un yalnız görüntüleme kolaylığı olarak kalması

### SEC-004 - Admin Server Action'ları yetkisiz çağrılabiliyor

- Durum: Düzeltildi
- Kanıt: `src/app/admin/actions.ts`, `src/app/admin/dashboard-actions.ts`
- Hedef: Her action içinde rol doğrulaması ve güvenli girdi doğrulaması

### SEC-005 - Dosya yükleme uç noktası açık ve sınırsız

- Durum: Uygulama katmanı düzeltildi; üretim reverse-proxy sınırı ve object storage bekliyor
- Kanıt: `src/app/api/upload/route.ts`
- Hedef: Admin kontrolü, MIME/uzantı/boyut sınırı, güvenli dosya adı ve üretimde object storage

### SEC-006 - Sipariş girdileri istemciden güvenilir kabul ediliyor

- Durum: Uygulama kodu, `OrderItem` snapshot ve idempotency entegrasyonu hazır; incremental migration uygulanmadı, `Decimal` dönüşümü kontrollü ayrı migration bekliyor
- Kanıt: `src/app/actions.ts:createOrder`
- Etki: Başka müşteri adına sipariş, oynanmış adet/çarpan, sahte `PAID`, yanlış toplam ve stok aşımı
- Hedef: Kimliği session'dan türetmek, birimi/fiyatı/stoku veritabanından okumak ve işlemi transaction içinde yapmak

## P1 - Sipariş, Stok ve Ürün Akışı

### ORD-001 - Sipariş kalemi snapshot'ları

- Durum: Şema, incremental SQL ve uygulama kodu hazır; veritabanına uygulanmadı.
- Yeni sipariş kodu ürün, birim, stok kodu, adet, çarpan, birim fiyat, iskonto ve para birimini değişmez `OrderItem` snapshot olarak aynı transaction içinde yazar.
- Migration öncesi eski siparişler için bilinmeyen kalemler uydurulmaz; ekranlar açıkça “snapshot yok” gösterir.

### ORD-002 - Finansal alanlar `Float`

- Fiyat, bakiye, limit ve sipariş toplamında `Decimal` kullanılmalı.

### ORD-003 - Atomik cari işlem ve idempotency

- Durum: Uygulama ve şema kodu hazır; migration/cutover bekliyor.
- Risk kontrolü, atomik stok azaltımı, bakiye güncellemesi, sipariş başlığı ve kalem snapshot'ları `Serializable` transaction içindedir.
- Tarayıcı güvenli UUID v4 anahtarını aynı denemede tekrar kullanır; müşteri + anahtar benzersizliği aynı siparişin iki kez oluşmasını engeller.

### B2B-001 - Açık kayıt finansal yetki veriyor

- Durum: Uygulama ve şema kodu düzeltildi; migration uygulanmadı.
- Yeni başvuru `PENDING_APPROVAL`, `riskLimit = 0` ve `discountRate = 0` ile açılır; kayıt sonrasında oturum oluşturulmaz.
- Yalnız `SUPERADMIN` firma kodu, satış temsilcisi, iskonto, risk limiti ve `ACTIVE`/`SUSPENDED` durumunu değiştirebilir.
- Doğru parola girilse bile aktif olmayan hesap giriş yapamaz; eski imzalı oturum çerezi de sunucu tarafında reddedilir.

### AUTH-001 - Admin girişinde genel “Sunucu hatası”

- Durum: Düzeltildi ve canlı yerel sunucuda hedefli HTTP testi geçti.
- Kök neden: Üretilmiş Prisma Client `Customer.status` alanını beklerken mevcut SQL Server'da kolon henüz yoktu. Admin e-postası bulunamadığında müşteri sorgusuna geçiliyor ve eksik kolon 401 yerine 500 üretiyordu.
- Düzeltme: Müşteri giriş sorgusu yalnız legacy kolonları seçiyor; kolon varsa gerçek durum ham, parametreli sorguyla okunuyor. Migration öncesi mevcut müşteriler, hazırlanan migration'ın backfill kuralıyla uyumlu biçimde `ACTIVE` kabul ediliyor.
- `.env` içinde secret bulunmadığı geliştirme çalışmasında farklı rota paketlerinin ayrı anahtar üretmemesi için fallback anahtar süreç genelinde sabitlendi; üretimde `SESSION_SECRET` zorunluluğu değişmedi.
- Yeni kayıt ve yeni sipariş/onay şeması isteyen ekranlar artık genel 500 yerine açıklayıcı 503/geçiş mesajı veriyor; veritabanına migration uygulanmadı.
- Doğrulama: Bilinmeyen e-posta 401, doğru admin e-postası + yanlış parola 401, migration öncesi yeni kayıt 503, `/giris` 200, yetkisiz `/admin` → `/giris` 307 ve `/api/health` 200.

### AUTH-002 - Girişten sonra geri tuşu eski giriş ekranını gösteriyor

- Durum: Düzeltildi ve açık yerel sunucuda oturumlu yönlendirme testi geçti.
- Kök neden: Başarılı girişten sonra `router.push()` kullanıldığı için `/giris` tarayıcı geçmişinde tutuluyordu; geri tuşu oturum çerezi hâlâ geçerliyken eski giriş ekranına dönebiliyordu.
- Düzeltme: Giriş sonrası yönlendirme `router.replace()` ile geçmiş girdisini değiştiriyor. `/giris` artık sunucu tarafında imzalı oturumu ve kullanıcı kaydını doğruluyor; açık oturum varsa role uygun ana sayfaya yönlendiriyor.
- Yönetici rolü hedefleri tek yardımcı fonksiyonda toplandı; beklenmeyen yönetici rolünün giriş ekranında döngüye girmesi yerine korumalı `/admin` köküne düşmesi sağlandı.
- Doğrulama: 3/3 rol-yönlendirme testi geçti. Geçici ve sonrasında silinen bir test yöneticisiyle giriş `200`; oturumlu `/giris` isteği `307 → /admin` sonucu verdi.

### STK-001 - Yeni ürün stok adedi olmadan oluşturuluyor

- Durum: Kod düzeltildi; mevcut veritabanı verileri değiştirilmedi
- Model varsayılanı `0`; admin formunda stok alanı yok.
- Veritabanındaki sekiz ürünün tamamı şu anda stok dışı.

### IMG-001 - Ürün görselleri vitrinde kullanılmıyor

- Durum: Düzeltildi
- `Product.imageUrl` var fakat `ProductCard` ve sepet placeholder gösteriyor.

### CAT-001 - Kategori yapısı hardcoded slug eşlemesine bağlı

- Durum: Alt kategori akışı düzeltildi; kalıcı model slug alanı bekliyor
- Kategori slug alanı ve benzersizliği modele taşınmalı.
- Geçici olarak Türkçe karakterleri güvenli ASCII slug'a çeviren ortak yardımcı ve parent-child doğrulaması kullanılıyor.

## Uygulanan İlk Düzeltme Paketi

- İmzalı, `HttpOnly`, `SameSite=Lax` oturum çerezi ve sunucu tarafı kullanıcı doğrulaması eklendi.
- Admin sayfaları, API'leri, Server Action'ları, bekleme listesi ve müşteri sipariş sorguları rol/hesap kontrolüne bağlandı.
- Admin müşteri API'leri açık alan listesine geçirildi; parola ve vergi kimliği yanıttan çıkarıldı.
- Yeni parolalar scrypt ile hash'leniyor; eski düz metin kayıtlar başarılı girişte dönüştürülüyor.
- `scripts/migrate-passwords.ts` kontrollü toplu geçiş/rotasyon aracı eklendi; zayıf demo parolaları rotasyon verilmeden değiştirmeyi reddediyor.
- Geçerli demo SUPERADMIN bilgileri giriş ekranından kaldırıldı; yıkıcı seed açık onay ve güçlü çevre parolaları olmadan çalışmıyor.
- Giriş ve kayıt için belleği sınırlı, uygulama katmanı hız sınırı eklendi.
- Upload yalnız yetkili roller için; istek boyutu, dosya boyutu, MIME, dosya imzası ve rastgele ad doğrulanıyor.
- Sipariş toplamı, iskonto, fiyat, birim çarpanı, stok ve risk sunucuda yeniden hesaplanıyor; stok, bakiye ve sipariş `Serializable` transaction içinde yazılıyor.
- Kredi kartı siparişi sahte `PAID` yerine `PENDING_PAYMENT` oluyor; ödeme sağlayıcısı yokken kart numarası/CVV toplayan form kaldırıldı.
- Yeni ürün formuna başlangıç ve minimum stok alanları eklendi; seed ürünlerine örnek pozitif stok tanımlandı fakat seed çalıştırılmadı.
- Ürün görselleri ürün kartında ve sepette gösteriliyor; görsel yoksa placeholder korunuyor.
- `/kategoriler` ve `/admin/siparisler` sayfaları eklendi; ana sayfa CTA bağlantıları çalışır rotalara bağlandı.
- Alt kategori rotası ve güvenli parent-child sorgusu eklendi; bozuk alt kategori bağlantıları düzeltildi.
- Müşteri sipariş takibi gerçek oturumdaki müşterinin son 100 siparişini gösteriyor.
- `/admin` rol bazlı başlangıç yönlendirmesi ve mağaza/admin layout ayrımı eklendi.
- Eksik CSS değişkenleri eklendi ve admin sipariş menüsü rollere göre gösteriliyor.
- B2B müşteri başvuru/onay/askıya alma akışı ve güvenli finansal koşul yönetimi eklendi.
- Sipariş idempotency anahtarı, başlık tutar snapshot'ları ve değişmez `OrderItem` kayıtları için şema, SQL ve uygulama entegrasyonu hazırlandı.
- Ürün detay sayfası, ürün kartı detay bağlantıları ve sunucuda yeniden doğrulama uyarısı eklendi.
- Salt-okunur SQL bağlantısını da sınayan `/api/health` rotası ve PID/RAM korumalı Webpack smoke testi eklendi.

## P2 - Eksik Sayfalar ve Kullanıcı Deneyimi

- Favoriler yalnız yerel kart state'i; kalıcı değil.
- Ürün detay sayfası eklendi; kalıcı favori modeli ve ilgili ürün önerileri bekliyor.
- Kampanyalar, banka hesapları, SSS, iade ve gizlilik sayfaları placeholder düzeyinde.
- Ödeme ekranı demo; gerçek sağlayıcı, teslimat, fatura, kargo ve sözleşme adımları yok.
- Checkout, hızlı sipariş, admin ve sepet mobil görünümü eksik.
- Ürün görselleri, ikon butonlar, form etiketleri ve slider için erişilebilirlik eksikleri var.

## P3 - Kalite, Sürümleme ve Dağıtım

- ESLint: 26 hata, 14 uyarı
- Güvenlik test dosyası: 1 (`tests/security-helpers.test.ts`)
- Prisma migration: güvenli incremental taslak var; incelenmiş başlangıç baseline'ı henüz yok ve migration uygulanmadı.
- `next-auth` bağımlılığı mevcut fakat kullanılmıyor.
- Projenin büyük bölümü Git'te commitlenmemiş; yalnız ilk Create Next App commit'i var.
- Yerel `public/uploads` yaklaşımı çok instance/serverless dağıtım için uygun değil.
- README kurulum, secret, migration, parola geçişi ve RAM-dostu çalıştırma bilgileriyle yenilendi.

## Uygulama Sırası

1. Mevcut düz metin parolaları yedekli ve kontrollü biçimde migrate edip zayıf demo parolalarını döndürmek
2. Gerçek şemadan incelenmiş baseline üretmek, yedek/restore denemek ve hazırlanan incremental migration'ı test veritabanında uygulamak
3. Prisma Client'ı migration cutover sırasında yeniden üretmek ve müşteri onayı + sipariş snapshot akışını entegrasyon testinden geçirmek
4. Parasal alanları mutabakatlı `Decimal` kolonlarına geçirmek
5. Gerçek ödeme/webhook, ödeme başarısızlığı/iptal/iade sonrası stok rezervasyonu çözümünü tamamlamak
6. Kalıcı favoriler, adres, kargo, e-posta ve object storage entegrasyonlarını eklemek
7. Mobil tasarım, kalan erişilebilirlik/lint/typecheck sorunları ve CI dağıtım hattını tamamlamak

## Hafif Doğrulama Sonuçları

- Başlangıç ölçümü: 15,73 GB toplam / 4,55 GB kullanılabilir RAM; projeye ait Node/Next süreci yoktu.
- İlk teslimde 256 MB heap ile `node scripts/check-source-syntax.mjs`: 66 TypeScript dosyası geçti; son oturum/geçmiş düzeltmesinden sonra güncel sonuç 70/70 oldu.
- 256 MB heap ile üç hedefli yardımcı test dosyası: 13 test geçti, 0 hata. Oturum, parola, rate limit, kategori slug'ı, müşteri durumu, idempotency eşleşmesi ve sipariş tutar yardımcıları kapsandı.
- Giriş sonrası hedef ve yönetici rolü eşlemesi için eklenen 3 hedefli test de 256 MB heap sınırıyla geçti.
- `prisma validate`: şema geçerli. Bu komut migration uygulamadı ve Prisma Client üretmedi.
- İlk tek-sunuculu smoke taslağı 8 rotayı geçtikten sonra belirlenen 512 MB Node heap sınırında kontrollü olarak kapandı; sistemde 4,34 GB RAM boş kaldı. Test aracı daha sonra iki ayrı 5-rotalık gruba bölündü.
- Son kontrollü Webpack smoke testi 10/10 sonucu geçti: `/api/health`, giriş, kayıt, ana sayfa, ürün 404, kategoriler, sepet, ödeme ekranı ve korumalı admin yönlendirmesi. Beklenen HTTP sonuçları `200`, ürün için `404`, yetkisiz admin için `/giris` yönlendirmeli `307` oldu.
- Smoke sırasında proje süreç ağacı tepe değeri 722,02 MB, görülen en düşük kullanılabilir RAM 3,49 GB oldu. Süreçler kapanır kapanmaz 4,16 GB, son teslim ölçümünde 4,46 GB RAM boştu ve projeye ait Node/Next süreci kalmadı.
- Tam `next build`, tam `tsc`, tam lint, veritabanı migration'ı, seed ve veri yazan sipariş testi çalıştırılmadı.
- Yeni müşteri onayı ve sipariş snapshot akışının gerçek SQL Server entegrasyon testi, yedek + incelenmiş baseline + test veritabanı sonrasına bırakıldı.
- Admin giriş olayı sırasında SQL Server salt-okunur katalog kontrolüyle `Customer.status`, `OrderItem` ve `Order.idempotencyKey` alanlarının henüz uygulanmadığı doğrulandı; admin kaydı, rolü ve parola hash'i geçerliydi.

## Değişiklik Günlüğü

- 2026-07-15: İnceleme raporu oluşturuldu; güvenli oturum ve müşteri API sınırı düzeltmesi başlatıldı.
- 2026-07-15: Oturum/parola/yetki, upload, sipariş transaction'ı, stok formu, ürün görselleri ve eksik iki rota için ilk düzeltme paketi uygulandı.
- 2026-07-15: Alt kategori, gerçek müşteri sipariş takibi, admin rol yönlendirmesi ve layout ayrımı tamamlandı.
- 2026-07-15: Hafif sözdizimi kontrolü 59/59, güvenlik yardımcı testleri 8/8 geçti; ağır Next süreçleri çalıştırılmadı.
- 2026-07-15: B2B müşteri onayı, sipariş idempotency/kalem snapshot'ları, ürün detay sayfası, migration taslağı, gerçek README ve RAM korumalı smoke aracı eklendi.
- 2026-07-15: Son düşük-RAM doğrulamasında sözdizimi 66/66, yardımcı testler 13/13, Prisma şeması ve iki gruplu HTTP smoke 10/10 geçti; DB migration uygulanmadı.
- 2026-07-15: Admin girişindeki şema uyumsuzluğu kaynaklı 500 düzeltildi; sözdizimi 67/67 ve hedefli canlı HTTP kontrolleri geçti. Tek sınırlı Webpack sunucusu kullanıcı isteğiyle 3100 portunda açık bırakıldı.
- 2026-07-15: Girişten sonra geri tuşunun eski `/giris` ekranını göstermesi `router.replace()` ve sunucu tarafı açık-oturum yönlendirmesiyle düzeltildi; 70/70 sözdizimi, 3/3 hedefli test ve canlı `307 → /admin` kontrolü geçti.
- 2026-07-15: Prisma Client şemadan yeniden üretildi; 53 tip hatası ve 30 lint sorunu sıfırlandı. `useHydrated` hook'u, `next-auth` kaldırma, üretimde sorgu logu kapatma ve `.gitignore` düzeltmeleri yapıldı. Tam `tsc`, lint, 16 test ve `next build` temiz geçti.
- 2026-07-15: Teslimat adresi paketi eklendi: `Address` modeli, `Order` üzerinde değişmez kargo snapshot kolonları, `20260715130000_address_and_shipping_snapshot` incremental migration taslağı, checkout'ta adres seçimi/ekleme, `hasAddressSchema()` ile migration öncesi geriye uyumluluk. Adres migration'ı uygulanana kadar sipariş adres istemez; uygulandıktan sonra zorunlu olur.
- 2026-07-15: Admin sipariş durumu yönetimi eklendi: `src/lib/order-status.ts` durum makinesi (rol bazlı yetkiler: ACCOUNTING ödeme onayı, WAREHOUSE sevkiyat, SUPERADMIN iptal), `updateOrderStatus` Server Action'ı Serializable transaction içinde iptalde stok ve cari bakiyeyi geri alıyor; kalem snapshot'ı olmayan eski siparişlerde otomatik iptal reddediliyor. 6 yeni durum-makinesi testiyle toplam 22 test geçti.
