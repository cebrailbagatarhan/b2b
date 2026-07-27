# TopTan Market Proje İnceleme ve Düzeltme Planı

Tarih: 17 Temmuz 2026
Kapsam: Next.js 16 uygulaması, Prisma/SQL Server veri modeli, mağaza, sepet, sipariş ve yönetim paneli  
Durum: İnceleme tamamlandı; güvenlik paketi, ödeme güvenliği ve B2B/B2C/pazaryeri hazırlık merkezi uygulandı

## Kaynak Kullanımı Notu

İnceleme sırasında `next dev` ile açılan Next.js 16 Turbopack geliştirme sunucusu dört Node işçisi oluşturdu. Birden fazla rota derlenirken toplam bellek kullanımı yaklaşık 8 GB seviyesine çıktı. Bu süreçlerin tamamı kapatıldı. Bundan sonraki çalışmalarda ağır geliştirme sunucusu, tam build ve tam typecheck kullanıcı onayı olmadan çalıştırılmayacak; doğrulamalar hedefli ve tek süreçli yapılacak.

İlk paket tesliminde çalışan proje, test veya Next.js Node süreci bırakılmamıştı. 15 Temmuz 2026 admin giriş düzeltmesinden sonra, kullanıcının açık bırakma isteğiyle `127.0.0.1:3100` üzerinde tek Webpack geliştirme sunucusu 768 MB Node heap sınırıyla geçici olarak açık bırakıldı. Bu sunucu daha sonra kapatıldı. 17 Temmuz 2026 son kontrolünde 15,73 GB toplam RAM'in yalnızca 2,14 GB'ı boştu ve 3000/3100 portlarında proje dinleyicisi yoktu. Bu nedenle güncel paket için Next sunucusu, tam build ve tam `tsc` açılmadı; projeye ait olduğu kanıtlanmayan küçük Node süreçlerine dokunulmadı.

Kanal hazırlık paketinin son doğrulamasından önce 15,73 GB toplam RAM'in 2,94 GB'ı kullanılabilirdi. Makinedeki mevcut 16 küçük `node.exe` sürecinin projeye ait olduğu kanıtlanmadığı için hiçbirine dokunulmadı; 3000/3100 portları boştu. Kontroller yalnız tek süreç ve 256 MB heap sınırıyla çalıştırıldı.

## Projenin Mevcut Kabiliyetleri

- Next.js 16 App Router ve React 19 tabanı
- Prisma üzerinden SQL Server bağlantısı
- Müşteri, admin, kategori, ürün, fiyat, birim, stok, sepet, sipariş, afiş ve bekleme listesi modelleri
- Ürün arama ve kategori listeleme
- Bayiye özel iskonto ve cari risk limiti
- Yerel tarayıcı sepeti ve hızlı stok kodu siparişi
- Admin dashboard, müşteri listesi, ürün ve afiş yönetimi
- B2B, B2C ve pazaryeri için ayrı sonuç veren kanal hazırlık merkezi ve güvenli CSV katalog raporu
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
- Aynı anahtar farklı teslimat adresiyle tekrar kullanılırsa önceki sipariş dönülmez; istek açık hatayla reddedilir.

### ORD-004 - Tamamlanmamış ödeme yöntemleri stok tutuyor

- Durum: Uygulama katmanında güvenli biçimde kapatıldı; gerçek sağlayıcı ve banka mutabakatı bekliyor.
- Kredi kartı, barındırılan ödeme sayfası ve imzalı webhook tamamlanana kadar hem arayüzde hem Server Action'da reddedilir.
- Havale/EFT, gerçek banka hesabı ve mutabakat süreci tamamlanana kadar reddedilir; örnek banka/IBAN kaldırıldı.
- Eski `PENDING_PAYMENT` ve `PENDING_TRANSFER` siparişlerinin sahibi, sipariş işleme alınmadan önce iptal ederek ayrılan stoğu Serializable transaction içinde yalnız bir kez geri bırakabilir.

### CHN-001 - B2B/B2C/pazaryeri katalog hazırlığı görünmüyor

- Durum: Salt-okunur hazırlık merkezi ve CSV denetimi eklendi; gerçek kanal adapter'ı ve veri modeli migration'ı bekliyor.
- `/admin/kanal-hazirlik`, ürünleri B2B, B2C ve pazaryeri açısından ayrı değerlendirir; ilk 1.000 ürünü ekranda özetler.
- `/api/admin/catalog-readiness`, tüm kataloğu 200 kayıtlık partilerle akış halinde UTF-8 CSV olarak verir; formül enjeksiyonu ve yetkisiz erişim engellenir.
- Barkod, marka, model/varyant, KDV, desi, kategori özellikleri ve liste/satış fiyatı mevcut şemada olmadığı için değer uydurulmaz; ilgili kanal açıkça engelli gösterilir.
- Ayrıntılı mimari ve uygulama sırası `PAZARYERI_B2B_B2C_EKSIKLER_VE_ENTEGRASYON_PLANI.md` dosyasındadır.

### B2B-003 - Bayi fiyatı yalnız ekranda gizleniyor

- Durum: Sunucu veri sınırında düzeltildi.
- Önceki davranışta anonim kullanıcı fiyatı kartta göremese de herkese açık ürün Server Action yanıtındaki ham `prices` ilişkisini inceleyebilirdi.
- Ürün listesi, arama, kategori, ürün detayı ve stok-kodu sorguları artık fiyatı yalnız doğrulanmış aktif müşteri veya doğrulanmış yönetici oturumuna döndürür.
- Anonim, geçersiz, eski veya askıdaki oturumda ürün bilgisi korunur fakat `prices` dizisi sunucuda boşaltılır; istemci tarafı gizlemeye güvenilmez.

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

- Durum: Düzeltildi; sunucu yönlendirmesi ve önbellekten geri dönüş senkronizasyonu hedefli testlerden geçti.
- Kök neden: Başarılı girişten sonra `router.push()` kullanıldığı için `/giris` tarayıcı geçmişinde tutuluyordu; geri tuşu oturum çerezi hâlâ geçerliyken eski giriş ekranına dönebiliyordu.
- Düzeltme: Giriş sonrası yönlendirme `router.replace()` ile geçmiş girdisini değiştiriyor. `/giris` artık sunucu tarafında imzalı oturumu ve kullanıcı kaydını doğruluyor; açık oturum varsa role uygun ana sayfaya yönlendiriyor. Tarayıcı `/giris` sayfasını bfcache'den geri yüklerse `pageshow` olayı sunucudaki `/api/auth/session` sonucunu yeniden doğruluyor ve yalnız doğrulanmış oturumda role uygun hedefe `replace` yapıyor.
- Yönetici rolü hedefleri tek yardımcı fonksiyonda toplandı; beklenmeyen yönetici rolünün giriş ekranında döngüye girmesi yerine korumalı `/admin` köküne düşmesi sağlandı.
- Doğrulama: 5/5 gezinme testi geçti. Önceki canlı kontrolde geçici ve sonrasında silinen bir test yöneticisiyle giriş `200`; oturumlu `/giris` isteği `307 → /admin` sonucu verdi. 17 Temmuz paketinde RAM yetersizliği nedeniyle gerçek tarayıcı bfcache E2E testi tekrar çalıştırılmadı.

### AUTH-003 - Parola değişince eski oturumlar açık kalıyor

- Durum: Düzeltildi.
- Kök neden: İmzalı oturumun süresi ve imzası doğrulansa da oturum, kullanıcının güncel parola kaydına bağlı değildi. Başka bir cihazdaki çerez, parola değiştikten sonra da süresi bitene kadar kullanılabiliyordu.
- Düzeltme: Oturum yüküne, saklanan parola hash'inden `SESSION_SECRET` ile üretilen HMAC tabanlı `credentialVersion` eklendi. Her yetkilendirme güncel hash ile sabit-zamanlı karşılaştırma yapıyor; parola değiştiğinde tüm eski oturumlar reddediliyor. Parolayı değiştiren tarayıcının çerezi de en iyi çabayla silinip `/giris` sayfasına yönlendiriliyor.
- Güvenli davranış: Güncel parola sürümüne ait meşru oturumlar çalışmaya devam ediyor. Eski format çerezler alanı taşımadığı için dağıtımdan sonra bir defalık yeniden giriş gerekecek.
- Doğrulama: Güncel hash eşleşmesi, değiştirilmiş hash reddi ve eski-format oturum reddi hedefli testlerden geçti.

### AUTH-004 - Parola sıfırlama bağlantısının üretim loguna sızması

- Durum: Düzeltildi.
- Kök neden: SMTP veya `nodemailer` bulunmadığında geliştirme önizlemesi için e-posta gövdesi ve sıfırlama URL'si loglanabiliyordu; aynı davranış üretimde token sızıntısına dönüşebilirdi.
- Düzeltme: Üretimde SMTP eksikliği, taşıyıcı eksikliği ve gönderim hataları yalnızca genel, secretsız mesaj yazar. Gövde/URL önizlemesi sadece geliştirme ortamında korunur; fırlatılan taşıyıcı hata ayrıntıları üretim loguna aktarılmaz.
- Doğrulama: SMTP yok, taşıyıcı yok, gönderim hatası ve başarılı gönderim sınırlarını kapsayan 5/5 test geçti; üretim loglarında e-posta gövdesi, URL veya token görünmedi.

### B2B-002 - Sabit telefon doğrulama kodu üretimde kullanılabiliyor

- Durum: Güvenlik açığı kodda kapatıldı; gerçek üretim kaydı SMS sağlayıcısı ve veritabanı indeksi tamamlanana kadar güvenli biçimde kapalıdır.
- Kök neden: Demo doğrulama kodu ortam ayrımı olmadan kabul edilebiliyor, telefon kolonu da veritabanında benzersiz değildi.
- Düzeltme: Sabit demo kodu yalnız geliştirmede kabul edilir ve ekranda yalnız geliştirmede gösterilir. Üretim kaydı gerçek tek-kullanımlık SMS sağlayıcısı olmadığı sürece açıklayıcı `503` döndürür. Kayıt, filtreli benzersiz telefon indeksi görülmeden de güvenli biçimde `503` ile durur.
- Veritabanı hazırlığı: Migration; telefon biçimi, mevcut geçersiz değerler ve tekrarlar için ön kontrol yaptıktan sonra `UX_Customer_phone_not_null` filtreli benzersiz indeksini oluşturacak şekilde hazırlandı. Canlı salt-okunur kontrolde telefon kolonu vardı; indeks yoktu. Bir dolu telefon değeri geçerliydi, tekrar yoktu. Migration uygulanmadı.
- Doğrulama: Geliştirmede demo kod kabulü, üretimde reddi ve gerçek kayıt Route Handler'ında geçerli telefon + sabit kod için `503`, bozuk telefon için `400` sonuçları test edildi.

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
- Oturumlar parola hash'inin güncel sürümüne bağlandı; parola değişince tüm eski çerezler geçersiz oluyor.
- Parola sıfırlama gönderiminde üretim loglarından e-posta gövdesi, URL, token ve taşıyıcı hata ayrıntıları çıkarıldı.
- Geri tuşuyla bfcache'den dönen `/giris` sayfası sunucu oturumunu yeniden doğrulayacak şekilde güncellendi.
- Sabit telefon doğrulama kodu üretimde kapatıldı; gerçek SMS ve benzersiz telefon indeksi hazır olana kadar üretim kaydı güvenli biçimde durduruldu.
- Kanal hazırlık merkezi, tüm katalog CSV raporu ve B2B/B2C/pazaryeri ayrımlı engelleyici kuralları eklendi.
- Sağlayıcısız kart/havale siparişleri kapatıldı; eski ödeme-bekleyen siparişlere güvenli müşteri iptali eklendi.
- Bayi fiyatları anonim/geçersiz oturumlara gönderilmeden sunucu tarafında kaldırılıyor.

## P2 - Eksik Sayfalar ve Kullanıcı Deneyimi

- Favoriler yalnız yerel kart state'i; kalıcı değil.
- Ürün detay sayfası eklendi; kalıcı favori modeli ve ilgili ürün önerileri bekliyor.
- Kampanyalar, banka hesapları, SSS, iade ve gizlilik sayfaları placeholder düzeyinde.
- Checkout yalnız yetkili B2B cari hesabı kabul ediyor; gerçek kart/havale sağlayıcısı, fatura, kargo, tüketici sözleşmesi ve iade adımları yok.
- Checkout, hızlı sipariş, admin ve sepet mobil görünümü eksik.
- Ürün görselleri, ikon butonlar, form etiketleri ve slider için erişilebilirlik eksikleri var.

## P3 - Kalite, Sürümleme ve Dağıtım

- Güncel güvenlik paketindeki değişen TypeScript/TSX ve test dosyaları hedefli ESLint kontrolünden hatasız geçti; bu paket üzerinde tam repo lint'i çalıştırılmadı.
- Güvenlik/iş-kuralı/kanal hazırlık test paketi: 12 dosya, 49 test.
- Prisma incremental migration dosyaları mevcut ve şema doğrulanıyor; ancak canlı veritabanında `_prisma_migrations` geçmişi ve incelenmiş başlangıç baseline'ı yok. Telefon kolonu mevcut, filtreli benzersiz telefon indeksi eksik. Canlı migration uygulanmadı.
- Kullanılmayan `next-auth` bağımlılığı kaldırıldı.
- Projenin büyük bölümü Git'te commitlenmemiş; yalnız ilk Create Next App commit'i var.
- Yerel `public/uploads` yaklaşımı çok instance/serverless dağıtım için uygun değil.
- README kurulum, secret, migration, parola geçişi ve RAM-dostu çalıştırma bilgileriyle yenilendi.

## Uygulama Sırası

1. Canlı SQL Server'ın tam yedeğini alıp ayrı test veritabanında geri yüklemek; gerçek şemadan incelenmiş baseline üretmek
2. Telefon verilerini mutabakatla doğrulayıp filtreli benzersiz telefon indeksini ve diğer incremental migration'ları önce test veritabanında uygulamak
3. Gerçek tek-kullanımlık SMS sağlayıcısını seçip süre, deneme limiti ve tekrar-kullanım kontrolleriyle entegre etmek; ardından üretim kaydını açmak
4. Kurumsal SMTP/işlem e-postası sağlayıcısını yapılandırıp gerçek teslimat ve parola sıfırlama uçtan uca testini yapmak
5. Mevcut düz metin parolaları yedekli ve kontrollü biçimde migrate edip zayıf demo parolalarını döndürmek
6. Ortak ürün modeline barkod, marka, model/varyant, KDV, çoklu görsel, özellik, desi ve liste/satış fiyatını kontrollü migration ile eklemek
7. Parasal alanları mutabakatlı `Decimal` kolonlarına geçirmek; gerçek ödeme/webhook ve iptal/iade akışını tamamlamak
8. Transactional outbox, kanal eşlemeleri, Trendyol V2 adapter'ı ve webhook + periyodik uzlaştırmayı staging üzerinde tamamlamak
9. B2B fiyat listesi/vade ve B2C tüketici/fiyat/hukuki akışlarını tamamlamak
10. Kalıcı favoriler, object storage, mobil/erişilebilirlik işleri, tam lint/typecheck/build ve CI dağıtım hattını tamamlamak

## Hafif Doğrulama Sonuçları

- 17 Temmuz 2026 kanal paketi öncesi ölçüm: 15,73 GB toplam / 2,94 GB kullanılabilir RAM. Son kontrol sonrasında 3,58 GB kullanılabilirdi. 3000/3100 portlarında proje dinleyicisi yoktu; sunucu açılmadı.
- `NODE_OPTIONS=--max-old-space-size=256` ile kaynak sözdizimi kontrolü: 112/112 TypeScript dosyası geçti.
- Aynı 256 MB heap sınırıyla `npm run test:security`: 12 dosyada 49/49 test geçti.
- Değişen TypeScript/TSX ve test dosyalarının hedefli ESLint kontrolü hatasız tamamlandı.
- `npx --no-install prisma validate`: Prisma şeması geçerli. Migration uygulanmadı ve veri yazılmadı.
- `git diff --check`: yalnız satır sonu dönüşümü uyarılarıyla temiz; boşluk hatası yok.
- Canlı SQL Server'a salt-okunur katalog/veri kontrolü: modern şema nesneleri mevcut ve temel bütünlük kontrolleri temiz; `_prisma_migrations` tablosu yok. `Customer.phone` var, `UX_Customer_phone_not_null` yok; 1 dolu telefon geçerli, tekrar yok.
- Oturum sürümü, eski oturum reddi, üretim e-posta logu, üretim demo telefon kodu reddi ve bfcache yönlendirme kararları hedefli testlerle doğrulandı.
- Bu güncel paket üzerinde tam `next build`, tam `tsc`, tam repo lint'i, Next sunucusu/tarayıcı E2E, gerçek SMTP teslimatı, gerçek SMS teslimatı, veritabanı migration'ı, seed veya veri yazan entegrasyon testi çalıştırılmadı.
- Önceki 15 Temmuz kontrollü Webpack smoke testi 10/10 rotayı geçmişti; bu tarihsel sonuç güncel güvenlik paketinin tarayıcı E2E kanıtı olarak kabul edilmedi.

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
- 2026-07-17: Parola değişiminde tüm eski oturumları geçersiz kılan credential sürümü, üretimde secretsız e-posta loglama, bfcache geri-dönüş oturum doğrulaması ve üretimde demo telefon kodunu kapatan güvenli kayıt kapısı eklendi. Telefon için filtreli benzersiz indeks migration'ı hazırlandı fakat uygulanmadı. 101/101 sözdizimi, 36/36 test, hedefli ESLint ve Prisma doğrulaması geçti; yalnız 2,14 GB RAM boş olduğu için sunucu/build/tsc açılmadı.
- 2026-07-17: B2B/B2C/pazaryeri kanal hazırlık merkezi ve akış halinde güvenli CSV eklendi. Sağlayıcısız kart/havale siparişleri sunucuda kapatıldı, örnek IBAN kaldırıldı, eski ödeme-bekleyen siparişlere güvenli müşteri iptali, idempotency anahtarına teslimat snapshot kontrolü ve bayi fiyatlarına sunucu tarafı erişim sınırı eklendi. 112/112 sözdizimi, 49/49 hedefli test ve hedefli ESLint geçti; kontrol öncesi 2,94 GB, sonrasında 3,58 GB RAM kullanılabilirdi. Sunucu/build/tsc açılmadı.
