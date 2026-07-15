# TopTan Market

Next.js 16, React 19, Prisma ve SQL Server tabanlı B2B toptan satış uygulaması.

## Gereksinimler

- Node.js 20.9 veya üzeri
- npm
- Erişilebilir bir Microsoft SQL Server
- En az 32 karakterli, projeye özel `SESSION_SECRET`
- Üretimde HTTPS ve güvenilir reverse proxy

## İlk Kurulum

1. Bağımlılıkları kurun:

   ```powershell
   npm ci
   ```

2. Örnek çevre dosyasını kopyalayın:

   ```powershell
   Copy-Item .env.example .env
   ```

3. `.env` içindeki `DATABASE_URL` ve `SESSION_SECRET` değerlerini gerçek, benzersiz değerlerle değiştirin. Örnek secret bilerek uygulama tarafından reddedilir.

4. Prisma Client'ı üretin:

   ```powershell
   npx prisma generate
   ```

5. Bu projede henüz incelenmiş bir baseline migration yoktur. Bu nedenle mevcut incremental migration'ı **şimdi çalıştırmayın**. Önce veritabanı yedeği alın ve `prisma/migrations/README.md` içindeki baseline prosedürünü tamamlayın. Ancak bundan sonra:

   ```powershell
   npx prisma migrate deploy
   ```

> `prisma/seed.ts` mevcut verileri siler. Yalnız boş yerel demo veritabanında, `ALLOW_DEMO_SEED=true` ve güçlü seed parolaları sağlanarak kullanılmalıdır.

## RAM Dostu Yerel Çalıştırma

Turbopack bu bilgisayarda önceki denemede birden fazla worker ile yüksek bellek kullandı. Windows PowerShell için kontrollü geliştirme komutu:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=768'
npm run dev -- --webpack -H 127.0.0.1 -p 3100
```

İşiniz bittiğinde geliştirme sunucusunu kapatın. Aynı anda `next dev`, `next build` ve tam typecheck çalıştırmayın.

Kısa HTTP kontrolünde manuel sunucu açmak yerine RAM/PID korumalı komutu kullanın:

```powershell
npm run test:smoke:low-memory
```

Bu araç başlangıçta boş RAM'i kontrol eder, rotaları iki küçük sunucu grubuna böler, Node heap'ini 512 MB ile sınırlar, proje süreç ağacı 1.300 MB'yi aşarsa testi keser ve yalnız kendi başlattığı süreçleri kapatır.

## Hafif Kontroller

```powershell
npm run check:syntax
npm run test:security
```

Bu iki komut Next geliştirme sunucusu veya production build açmaz.

Uygulama çalışırken `/api/health`, yalnız servis ve SQL Server erişilebilirliğini genel bir `ok/unavailable` yanıtıyla bildirir; bağlantı ayrıntısı veya secret döndürmez.

## Güvenlik Notları

- Kimlik doğrulama, imzalı `HttpOnly` cookie ve sunucu tarafı rol kontrolleri kullanır.
- Yeni parolalar scrypt ile hash'lenir.
- Eski düz metin parolaları dönüştürmek için önce yedek alın ve güçlü yeni parolaları çevre değişkeniyle sağlayın:

  ```powershell
  $env:CONFIRM_PASSWORD_MIGRATION='YES'
  $env:PASSWORD_ROTATIONS_JSON='{"admin@example.com":"BENZERSIZ-UZUN-PAROLA"}'
  npm run security:migrate-passwords
  ```

- Kart numarası ve CVV uygulama tarafından alınmaz. Gerçek ödeme için PCI uyumlu ödeme sağlayıcısının barındırdığı sayfa kullanılmalıdır.
- Yerel `public/uploads` yalnız geliştirme içindir. Üretimde object storage, virüs taraması ve CDN gerekir.
- Uygulama katmanı rate limit tek sunucu içindir. Çok instance üretimde Redis tabanlı merkezi rate limit gerekir.

## Mevcut Belgeler

- `PROJE_INCELEME_VE_DUZELTME_PLANI.md`: doğrulanmış bulgular ve uygulanan düzeltmeler
- `PROJE_GEREKSINIMLERI_VE_YOL_HARITASI.md`: kalan işler, bağımlılıklar ve kabul kriterleri
- `prisma/migrations/README.md`: veritabanı baseline/migration uygulama notları

## Üretime Çıkmadan Önce

- Tüm gerçek parolaları döndürün ve migration sonucunu doğrulayın.
- Production `SESSION_SECRET`, SQL Server TLS ve yedekleme politikasını kurun.
- Object storage, e-posta servisi ve ödeme sağlayıcısını bağlayın.
- Tam lint, typecheck, production build ve HTTP entegrasyon testlerini CI üzerinde çalıştırın.
- `APP_DEBUG` benzeri ayrıntılı hata çıktılarının kapalı olduğunu doğrulayın.
