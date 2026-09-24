# GPT-5.6 için B2C uygulama rehberi

Bu rehber, B2B uygulamasını bireysel müşteriye satış yapabilen bir mağazaya dönüştürmek için görev seçimini ve uygulama sınırlarını tanımlar. GPT-5.6 veya başka bir kodlama ajanı her oturumda buradan başlayabilir. Belgenin eklenmesi, uygulama işlerinin tamamlandığı anlamına gelmez.

## İlk okuma sırası

1. Repo kökündeki [AGENTS.md](../../AGENTS.md) dosyasını ve çalışılacak dizinin varsa yerel talimatlarını oku.
2. Bu rehberi, [ilerleme tablosunu](ILERLEME.md) ve seçilen görevin [görev kartını](GOREVLER.md) oku.
3. Gerektiğinde [dayanak incelemeyi](ANALIZ_2026-09-24.md), [teknik yol haritasını](../../PROJE_GEREKSINIMLERI_VE_YOL_HARITASI.md) ve [migration prosedürünü](../../prisma/migrations/README.md) aç.

**Uygulama durumunun tek kaynağı `ILERLEME.md` dosyasıdır.** İnceleme belgesindeki R01–R22 ürün gereksinimleridir; T00–T29 bunların küçük uygulama paketleridir. Eski raporlardaki tarihlenmiş bulgular canlı sistemin bugünkü durumu sayılmaz.

## Başlangıçta doğrulanan durum — 24 Eylül 2026

- Repo: `cebrailbagatarhan/b2b`; ana dal: `master`.
- İncelenen ana dal commit'i: `e3d34a9ce5852100af1c0ad2998335f214776489`.
- [PR #1](https://github.com/cebrailbagatarhan/b2b/pull/1) açık: CI, kilit dosyası düzeltmesi ve `nodemailer` bağımlılıklarını ekliyor. Başındaki commit: `1405955c5a5e4d108a13eb6e122f38f31ad5a9b4`.
- Bu commit için [CI çalışması başarılı](https://github.com/cebrailbagatarhan/b2b/actions/runs/32634047051). Bu sonuç, sonraki commit'lerin veya B2C alışveriş akışının doğrulaması değildir.
- PR #1 ana dala henüz girmedi. CI ve e-posta bağımlılığı işini baştan yazma; T00'da mevcut çalışmayı uzlaştır.
- PR #1'in geçici CI veritabanındaki `db push` adımı, incelenmiş migration baseline'ı veya üretim yedek/geri dönüş kanıtı değildir.
- Katalog, adres, bayi hesabı, cari sipariş ve bazı sipariş bütünlüğü kontrolleri var. Gerçek dış ödeme, tüketici kaydı, sevkiyat ve iade yaşam döngüsü tamamlanmış değil.

Her yeni oturumda dal/commit ve açık PR durumunu yeniden kontrol et; bu snapshot'ı koşulsuz doğru kabul etme.

## Ürün kapsamı

Çalışma varsayımı: Türkiye'de TRY ile fiziksel ürün satan **tek satıcılı B2C mağaza**. Mevcut bayi siparişi, cari limit, iskonto ve fiyat gizliliği korunur. Bireysel müşteri bayi onayından geçmez; cari ödeme yetkisi otomatik kazanmaz.

Mevcut Next.js, Prisma ve SQL Server yapısıyla ilerle. Çerçeve/veritabanı değişimi, çok satıcılı pazaryeri, satıcı hakedişi, mobil uygulama ve pazaryerlerine otomatik aktarım bu iş listesinin ilk sürümüne dahil değil. Güncel kullanıcı isteği kapsamı değiştirirse kararı aşağıdaki kayıtla güncelle.

## Karar ayrımları

| ID | Konu | Bu plandaki başlangıç yaklaşımı | Uygulama kuralı |
|---|---|---|---|
| D01 | B2B / B2C | Ortak ürün çekirdeği; ayrı hesap, fiyat ve ödeme yetkisi | Mevcut kullanıcıları topluca tüketiciye çevirmek veya bayi fiyatını kamuya açmak yok. Mevcut hesaplar B2B olarak korunur. |
| D02 | Kayıt / doğrulama | Tüketicide gerçek e-posta doğrulaması; telefon teslimat iletişimi için | SMS doğrulaması istenirse gerçek OTP eklenir. Üretimde demo kodunu açmak çözüm değildir. Sağlayıcı hesabı eksikse taşıyıcı kodu hazırlanır, gerçek teslimat bekler. |
| D03 | Misafir alışveriş | İlk sürümde desteklenmesi öneriliyor | Kimlik doğrulama/sipariş erişimi güvenli token ile kurulur; herkese açık sipariş numarasıyla erişim verilmez. Politika değişirse T11/T12 güncellenir. |
| D04 | Ödeme sağlayıcısı | Seçim bekliyor; barındırılan ödeme sayfası | T13 sağlayıcıdan bağımsız çekirdektir. T14 için gerçek sandbox hesabı ve güncel resmî doküman gerekir. Sağlayıcı yoksa kart/EFT kapalı kalır. |
| D05 | Kargo | İlk sürümde tarifeli ücret ve yönetimden takip numarası girişi | Gerçek ücret, ücretsiz kargo eşiği, servis bölgesi ve teslim süresi işletmeden alınır; ücretsiz/ertesi gün varsayılmaz. Otomatik etiket ayrı geliştirmedir. |
| D06 | Fatura / iade / koşullar | Geçerli fatura belgesini iliştirme; satır/adet bazlı iade | Şirket ve fatura yöntemi, vergi kuralları, iade/teslimat metinleri işletmeyle doğrulanır. Uygulama sahte e-fatura üretmez; taslak metin onaylanmış sayılmaz. |
| D07 | Görsel ve e-posta hizmeti | Adapter üzerinden seçilecek hizmetler | Sağlayıcı, domain, erişim ve ortam bilgisi doğrulanır; sırlar repoya yazılmaz. Sahte başarılı yanıtla üretim özelliği açılmaz. |
| D08 | Veri / dağıtım | Ayrı test SQL Server ve ayrı üretim ortamı | Kod ve test DB işleri yapılabilir. Canlı migration/yayın ancak oturumda verilmiş yetki ve somut geçiş planı kapsamındadır; önceki yetki tekrar sorulmaz. |

D01–D03 tasarım varsayımlarıdır; D04–D08'in gerçek işletme değerleri bu belgede seçilmiş veya sağlanmış değildir. Varsayımlarla kod/fixture hazırlanabilir, fakat eksik işletme kararı veya servis testi üretim hazır sayılmaz. Kullanıcıdan yalnız eksik ve sonucu gerçekten değiştiren bilgi istenir.

## Hangi işi seçmelisin?

| Durum | İzlenecek yol |
|---|---|
| Kullanıcı belirli bir T numarası verdi | Ön koşullarını doğrula ve yalnız verilen kapsamdaki işi yap. Eksik ön koşulu açıkça kaydet. |
| Kullanıcı sıradaki işi istedi | `ILERLEME.md` içinde bağımlılıkları sağlanan en düşük numaralı P0 işi seç. |
| Bir iş dış hesaba/veriye takıldı | Yapılabilen kodu ve testleri tamamla; tam görevi bitmiş sayma. Genel ilerleme yetkisi varsa bağımsız hazır göreve geç. |
| PR aynı işi zaten yapıyor | İçeriği ve ilgili commit'teki doğrulamayı kontrol et; tekrar uygulama. Mevcut yetki kapsamında çalışma dalına dahil et veya bağımlılık olarak kaydet. |
| Güncel kod, kartta yazandan farklı | Önce gerçek durumu incele; kartı düzelt. Eski eksik listesini sağlamak için çalışan kodu geri alma. |
| T00–T23 tamamlanmadı | T24 satış açılışı yapılmaz. Sağlayıcı/operasyon eksikleri kapalı özelliği görünür biçimde hazır hale getirmez. |
| P0 işler tamamlandı | T25–T29'a, kullanıcının kapsamı ve ticari önceliğine göre geç. |

T numarası tek başına yürütme sırası değildir: örneğin T12, daha erken hazırlanabilen T20 içerik/koşul işine bağlıdır. Bağımlılık tablosu belirleyicidir. İşlerin bağımsız olması ayrı ajanlar çalıştırılması talimatı değildir.

## Bir görev paketini nasıl tamamlayacaksın?

1. Dalı, commit'i, çalışma ağacını ve açık PR'ları kontrol et. Kullanıcının mevcut değişikliklerini koru. Temiz bir çalışma dalında ilerle.
2. Seçilen kartın mevcut dosyalarını oku. Kartta “önerilen yeni” olarak belirtilen yolların gerçekten oluşmuş olup olmadığını kontrol et.
3. Next.js kodu yazmadan önce repo talimatı gereği kurulu sürümün `node_modules/next/dist/docs/` içindeki ilgili rehberini oku. Haricî sağlayıcı entegrasyonunda güncel resmî kaynağı doğrula.
4. Tek karta ait UI, sunucu kuralı ve gerekiyorsa veri geçişini birlikte tamamla. Kart büyük gelirse aynı kabul ölçütlerini koruyan alt paketleri açık bağımlılıkla kaydet; ilgisiz işleri aynı PR'a doldurma.
5. Migration varsa önce test verisinde dene. Mevcut kayıtların sayısı, tutarı ve ilişkileri korunmalı. Şema değişikliğiyle Prisma Client ve uygulama okuma/yazma yollarını birlikte güncelle.
6. Kartın anlamlı kabul senaryolarını çalıştır. Yalnız helper testi veya mock başarılı diye gerçek ödeme/e-posta/kargo doğrulandı deme.
7. `ILERLEME.md` satırını değişen commit/PR, çalıştırılan kontroller ve kalan engelle güncelle. Test yapılmadıysa bunu açıkça yaz.
8. Kapsamdaki işi review edilebilir değişiklik ve kısa PR açıklamasıyla teslim et. Görev kapsamı birden çok kartı içeriyorsa hazır kartlarla devam et; kullanıcıdan her küçük adım için yeniden izin isteme.

Bu rehber tek başına canlı veri değiştirme, harcama, müşteri mesajı gönderme veya tüm backlog'u çalıştırma yetkisi vermez. Güncel konuşmada verilen kapsam ve yetki geçerlidir.

## Doğrulama sözleşmeleri

Görev kartlarında aşağıdaki kısaltmalar kullanılır:

| Kod | Ne kanıtlar? |
|---|---|
| K | Değişen kaynaklarda ilgili lint/type/syntax ve anlamlı birim/entegrasyon kontrolleri. T00 sonrası mevcut script'leri kullan: `check:syntax`, `lint`, `typecheck`, `test:security`. Gerekli yeni test mevcut script'e veya CI'a bağlanır. |
| DB | Ayrı test SQL Server'da migration, veri geçişi ve ilgili bütünlük/eşzamanlılık senaryosu. CI `db push` başarısı bu kanıtın yerine geçmez. |
| UI | İlgili gerçek kullanıcı akışının tarayıcıda, gereken mobil genişlikte ve hatalı durumda doğrulanması. |
| EXT | Seçilmiş sağlayıcının sandbox'ında gerçek istek/bildirim/teslimat sonucu. Mock yalnız yerel sözleşme testidir. |

Salt doküman değişikliğinde uygulama build/test'i gereksizdir; bağlantı ve bağımlılık tutarlılığını doğrula. Uygulama değişikliğinde kontrolleri somut riske göre seç; repo RAM politikasına uy ve ağır kontrolleri aynı anda çalıştırma. Gerekli build/entegrasyon kontrolünü yeterli kaynaklı CI'da yap; atlanan kontrolü başarılı yazma.

## Değişmemesi gereken iş kuralları

- B2B fiyatı anonim, tüketici, askıdaki veya geçersiz oturuma verilmez. B2C fiyatı ayrı kamuya açık fiyat kapsamından gelir.
- Sepetten gelen fiyat, iskonto ve toplam güvenilir kabul edilmez; sunucu hesaplar. Decimal taşıma/serileştirme sözleşmesi tutarlı olmalıdır.
- Ödeme, sevkiyat ve iade durumları ayrı izlenir. Tarayıcının “başarılı” dönüşü tahsilat kanıtı değildir.
- Sipariş, rezervasyon, webhook, kupon ve refund tekrarları ikinci yan etki üretmez. Para birimi/tutar/kimlik kontrolü yapılır.
- Bir siparişin adres, ürün adı, birim, fiyat, vergi ve indirimi sipariş anındaki snapshot'tır; ürün sonradan düzenlenince geçmiş değişmez.
- İadede fiziksel mal kabulü ile para iadesi farklı olaylardır; stok ve ödeme aynı anda olmuş varsayılmaz.
- Kalıcı kimlik ve audit kaydı kullanılır; sırlı bağlantı, kart verisi veya müşteri kişisel verisi loglara konulmaz.
- Başarısız dış servis veya eksik sağlayıcı müşteri ekranında sahte başarı oluşturmaz.

## GPT-5.6'ya verilecek başlangıç metni

```text
Bu repoda AGENTS.md, docs/gpt-5.6/README.md ve docs/gpt-5.6/ILERLEME.md dosyalarını oku.
Güncel branch/commit ve açık PR'ları doğrula. PR #1'in bugünkü durumunu kontrol et;
mevcut CI/e-posta bağımlılığı çalışmasını tekrarlama.

Bu oturumda bağımlılıkları sağlanan ilk P0 görev paketini seç ve
docs/gpt-5.6/GOREVLER.md içindeki kartına göre uygula. Yalnız plan yazıp bırakma;
yetkili kapsam içindeki kodu, gerekli testleri ve dokümantasyonu tamamla.

B2B bayi fiyatı/cari yetkisini koru; B2C erişimini ayrı kur.
Eksik servis hesabını veya gerçek işletme bilgisini uydurma. Dış bağımlılık varsa
yapılabilen kısmı bitir, eksik kanıtı belirt ve görevi tamamlandı sayma.

Sonunda değişen dosyaları, doğrulanan kabul ölçütlerini, çalıştırılan kontrolleri,
kalan engeli ve sıradaki hazır görevi ILERLEME.md'ye yaz. İncelenebilir PR hazırla.
```

Belirli bir görev için üçüncü paragrafın ilk cümlesi `Bu oturumda yalnız Txx görev paketini uygula` olarak değiştirilebilir. Daha önce verilmiş kapsam/izin bu metin nedeniyle tekrar sorulmaz.
