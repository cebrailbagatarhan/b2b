# Uygulama ilerlemesi

Güncelleme: 24 Eylül 2026. Bu kayıt dokümantasyon teslimidir; aşağıdaki uygulama görevlerinden hiçbiri bu PR ile tamamlanmış sayılmaz.

## Durum sözlüğü

- `HAZIR`: seçilebilir başlangıç işi; çalıştırılan kabul kanıtı anlamına gelmez.
- `BEKLIYOR`: ön koşulu henüz tamamlanmadı.
- `CALISILIYOR`: aktif görev; aynı anda tek ana görev kaydedilir.
- `DIS_BAGIMLILIK`: somut eksik hesap/veri/işletme kararı kayıtlı.
- `INCELEMEDE`: kabul kontrolleri geçti; değişiklik PR'da ve henüz temel dala alınmadı.
- `TAMAMLANDI`: değişiklik uygulama temelinde mevcut; gerekli kabul kanıtı ve commit/PR bağlantısı kaydedildi. Sağlayıcılı görevlerde gerçek sandbox kanıtı da gerekir.

İncelemedeki bir PR üzerine çalışılacaksa bu tercih ve base commit kaydedilir; `INCELEMEDE` otomatik `TAMAMLANDI` sayılmaz. Kullanıcının mevcut yetkisi kapsamında bağımlı dal kullanılabilir. Ana dala birleşim varsayılmaz.

## Sıradaki adım

**T00:** [PR #1](https://github.com/cebrailbagatarhan/b2b/pull/1) durumunu yeniden kontrol et ve geliştirme temelini belirle. 24 Eylül 2026 incelemesinde PR açıktı; `1405955c5a5e4d108a13eb6e122f38f31ad5a9b4` commit'inde [CI başarılıydı](https://github.com/cebrailbagatarhan/b2b/actions/runs/32634047051). Bu teslimde o PR birleştirilmedi ve yeni uygulama testleri çalıştırılmadı.

T00 sonrasında T01 ile veri temeli, bağımsız olarak T20 ile işletme içerikleri hazırlanabilir. D04 ödeme, D05 kargo, D06 fatura/koşul ve D07 servis bilgileri erkenden toplanmalı; eksik değerler uydurulmamalı.

## Görev tablosu

| ID | Öncelik | Görev | Bağımlılık | Durum | Kanıt / kalan engel |
|---|---|---|---|---|---|
| T00 | P0 | Mevcut CI çalışmasını uzlaştır | — | HAZIR | PR #1 mevcut; son durum ve çalışma temeli doğrulanacak. |
| T01 | P0 | SQL Server baseline ve güvenli migration | T00 | BEKLIYOR | Gerçek şema export'u, test SQL Server ve restore kanıtı gerekli. |
| T02 | P0 | Para ve vergi hesaplama sözleşmesi | T01 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T03 | P0 | Tüketici ve bayi erişim/fiyat ayrımı | T02 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T04 | P0 | Ürün, özellik, galeri ve varyant modeli | T03 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T05 | P0 | Kalıcı görsel yükleme | T04 | BEKLIYOR | D07 storage hesabı/ortamı gerekli. |
| T06 | P0 | Ürün düzenleme ve stok değişiklik kaydı | T04, T05 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T07 | P0 | Filtreli arama ve sayfalama | T04 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T08 | P0 | Ürün detayı ve vitrin | T06, T07 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T09 | P0 | Gerçek e-posta ve bildirim kuyruğu | T01 | BEKLIYOR | D07 e-posta hesabı ve yetkili test alıcısı gerekli. |
| T10 | P0 | Tüketici kaydı ve hesap doğrulaması | T03, T09 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T11 | P0 | Misafir ve kullanıcı sepeti | T03, T04 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T12 | P0 | Adres, fatura ve toplamı gösteren checkout | T02, T10, T11, T20 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T13 | P0 | Ödeme durumu ve stok rezervasyonu çekirdeği | T02, T04, T11 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T14 | P0 | Gerçek ödeme sağlayıcısı ve webhook | T12, T13 | BEKLIYOR | D04 sağlayıcı seçimi ve gerçek sandbox hesabı gerekli. |
| T15 | P0 | Sevkiyat ve müşteri kargo takibi | T14 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T16 | P0 | Fatura erişimi ve siparişe bağlı destek | T14, T20 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T17 | P0 | İade talebi ve mal kabul | T15 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T18 | P0 | Tam ve kısmi para iadesi | T14, T17 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T19 | P0 | Sipariş olaylarından gerçek bildirim | T09, T14, T15, T18 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T20 | P0 | Mağaza bilgileri ve satış koşulları | T00 | BEKLIYOR | D05/D06 gerçek işletme verileri ve metin doğrulaması gerekli. |
| T21 | P0 | Ürün ve kategori SEO'su | T07, T08, T20 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T22 | P0 | Mobil ve erişilebilir uçtan uca alışveriş | T08, T12, T15, T17, T18, T21 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T23 | P0 | Operasyon izleme ve dönüşüm olayları | T14, T18, T19 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T24 | P0 | Satış açılışı kabul paketi | T00–T23 | BEKLIYOR | Tüm P0 kanıtları aynı yayın adayında doğrulanacak. |
| T25 | P1 | Kalıcı favoriler | T24 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T26 | P1 | Kupon ve kampanyalar | T24 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T27 | P1 | Alıcı yorumları ve soru-cevap | T24 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T28 | P1 | İlgili ürünler ve stok bildirimi | T24 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |
| T29 | P1 | Satış ve dönüşüm raporları | T24 | BEKLIYOR | Uygulama ve kabul kanıtı henüz yok. |

## İlk incelemedeki gereksinim eşlemesi

R numaralarının açıklamaları [dayanak incelemede](ANALIZ_2026-09-24.md) bulunur.

| Gereksinim | Görev paketleri |
|---|---|
| R01 | T00, T01 |
| R02 | T02 |
| R03 | T03 |
| R04 | T09, T10 |
| R05 | T04 |
| R06 | T05, T06 |
| R07 | T07 |
| R08 | T08 |
| R09 | T11 |
| R10 | T12, T20 |
| R11 | T13, T14 |
| R12 | T15 |
| R13 | T17, T18 |
| R14 | T16 |
| R15 | T09, T19 |
| R16 | T20, T21 |
| R17 | T22 |
| R18 | T23, T24 |
| R19 | T25, T28 |
| R20 | T26 |
| R21 | T27, T28 |
| R22 | T29 |

## İşletme kararı kaydı

| Karar | Durum | Gerçek değer / karar sahibi / tarih |
|---|---|---|
| D01 | Çalışma varsayımı | Tek satıcı; ayrı B2B/B2C hesap ve fiyat kapsamı |
| D02 | Çalışma varsayımı | B2C e-posta doğrulaması; SMS zorunluluğu ayrıca netleştirilecek |
| D03 | Çalışma varsayımı | Misafir checkout öneriliyor |
| D04 | Bekliyor | Ödeme sağlayıcısı ve sandbox hesabı sağlanmadı |
| D05 | Bekliyor | Kargo tarifesi, servis bölgesi ve teslim süresi sağlanmadı |
| D06 | Bekliyor | Gerçek şirket/fatura/iade/koşul bilgileri doğrulanmadı |
| D07 | Bekliyor | Storage ve e-posta ortam erişimleri sağlanmadı |
| D08 | Bekliyor | Test DB/şema export'u ve üretim geçiş/yayın kapsamı kaydedilmedi |

## Her görevden sonra eklenecek kayıt

```text
Görev: Txx
Durum: ...
Çalışma base commit'i: ...
Değişiklik commit'i / PR: ...
Karşılanan kabul ölçütleri: ...
Çalıştırılan kontroller ve sonuçları: ...
Yapılmayan kontrol ve somut nedeni: ...
Gerçek sandbox / test DB / tarayıcı kanıtı: ...
Migration ve geri dönüş etkisi: ...
Kalan dış bağımlılık: ...
Sıradaki bağımlılıkları sağlanan görev: ...
```

Belgeyi hazırlamak, test kodunu yazmak veya mock'un geçmesi tek başına uygulamayı tamamlamaz. Eski raporların tarihli test sonuçlarını yeni commit için yeniden çalıştırılmış gibi kaydetme.

