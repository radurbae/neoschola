# Panduan Deploy Demo Live NeoSchola (3 Subdomain)

Dokumen ini menjelaskan prosedur deployment arsitektur live 3 subdomain untuk platform NeoSchola dari repositori GitHub `radurbae/neoschola`.

## Tabel Arsitektur 3 Subdomain

| Komponen | Domain Publik | Platform Host | Konfigurasi Deployment | Catatan Build |
| :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | `https://neoschola.floc.site` | Vercel | Root Directory: `apps/landing`<br>File config: `apps/landing/vercel.json` | Statis murni tanpa build command |
| **Demo Web App** | `https://app.neoschola.floc.site` | Vercel | Root Directory: `apps/mobile`<br>File config: `apps/mobile/vercel.json` | Command: `npm run build:mobile:web`<br>Output: `dist` |
| **Backend API** | `https://api.neoschola.floc.site` | Railway | Root repo: `railway.json`<br>Dockerfile: `apps/api/Dockerfile` | Bun Docker runtime dengan Persistent Volume `/data` |

---

## Bagian 1: Deploy Backend API (api.neoschola.floc.site) di Railway

Backend NeoSchola mengandalkan runtime Bun Alpine dan database SQLite yang membutuhkan penyimpanan persisten.

### Prosedur Setup di Railway
1. Buat project baru di Railway, pilih **Deploy from GitHub repo**, lalu sambungkan ke repositori `radurbae/neoschola`.
2. Railway otomatis mendeteksi file konfigurasi root `railway.json` yang mengarahkan builder Dockerfile ke `apps/api/Dockerfile`.
3. Tambahkan volume persisten:
   - Masuk ke tab **Volumes** pada service API.
   - Klik **Add Volume** dengan Mount Path: `/data`.
4. Konfigurasikan **Variables** pada service API:
   ```env
   NODE_ENV=production
   DATABASE_PATH=/data/neoschola.sqlite
   JWT_SECRET=buat_kunci_acak_minimal_32_karakter
   CORS_ORIGIN=https://app.neoschola.floc.site,https://neoschola.floc.site
   SEED_DEMO_DATA=true
   ALLOW_DEMO_RESET=false
   ```
   > Generate string acak untuk `JWT_SECRET` pada terminal lokal dengan perintah:
   > ```bash
   > openssl rand -hex 32
   > ```
5. Sambungkan custom domain:
   - Buka tab **Settings** -> **Networking** -> **Custom Domain**.
   - Tambahkan domain `api.neoschola.floc.site`.
   - Salin DNS Target record CNAME yang diberikan oleh Railway untuk dipasang pada DNS provider.

### Opsi Alternatif Hosting API
- **Fly.io**: Siapkan volume persisten terlebih dahulu via CLI:
  ```bash
  fly volumes create neoschola_data --size 1
  ```
  Mount volume tersebut ke `/data` pada file konfigurasi `fly.toml`.
- **Render**: Hindari tier free Render untuk database SQLite produksi atau demo aktif karena free tier Render tidak menyediakan persistent disk, sehingga data akan terhapus setiap restart container.
- **VPS Docker Mandiri**:
  ```bash
  mkdir -p /srv/neoschola/data
  chown -R 1000:1000 /srv/neoschola/data

  docker build -f apps/api/Dockerfile -t neoschola-api:latest .
  docker run -d \
    --name neoschola-api \
    --restart unless-stopped \
    -p 3001:3001 \
    -v /srv/neoschola/data:/data \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DATABASE_PATH=/data/neoschola.sqlite \
    -e JWT_SECRET="hasil_generate_openssl" \
    -e CORS_ORIGIN="https://app.neoschola.floc.site,https://neoschola.floc.site" \
    -e SEED_DEMO_DATA=true \
    -e ALLOW_DEMO_RESET=false \
    neoschola-api:latest
  ```

---

## Bagian 2: Deploy Demo Web App (app.neoschola.floc.site) di Vercel

Aplikasi demo merupakan web export React Native (Expo Web) yang menyajikan antarmuka interaktif untuk Wali Murid, Guru, dan Staf TU.

### Prosedur Setup di Vercel
1. Pada dashboard Vercel, klik **Add New** -> **Project**, lalu impor repositori `radurbae/neoschola`.
2. Ubah konfigurasi **Root Directory** ke: `apps/mobile`.
3. Biarkan Framework Preset sebagai **Other**. Konfigurasi instalasi monorepo dan build script akan dikendalikan otomatis oleh `apps/mobile/vercel.json`:
   - `installCommand`: `cd ../.. && npm ci`
   - `buildCommand`: `cd ../.. && npm run build:mobile:web`
   - `outputDirectory`: `dist`
4. Masukkan **Environment Variables**:
   ```env
   EXPO_PUBLIC_API_URL=https://api.neoschola.floc.site
   EXPO_PUBLIC_APP_VARIANT=all
   EXPO_PUBLIC_DEMO_MODE=true
   ```
5. Deploy project, lalu buka **Settings** -> **Domains**. Tambahkan domain: `app.neoschola.floc.site`.

---

## Bagian 3: Deploy Landing Page (neoschola.floc.site) di Vercel

Landing page NeoSchola dibangun dengan Vanilla JavaScript murni, HTML5, dan CSS modern tanpa tahapan kompilasi.

### Prosedur Setup di Vercel
1. Buat project baru kedua di dashboard Vercel dari repositori yang sama (`radurbae/neoschola`).
2. Tentukan nama project, misalnya `neoschola-landing`.
3. Set **Root Directory** ke: `apps/landing`.
4. Biarkan Framework Preset sebagai **Other** tanpa build command. File `apps/landing/vercel.json` akan menerapkan konfigurasi clean URLs dan HTTP security headers secara otomatis.
5. Deploy project, lalu masuk ke menu **Settings** -> **Domains** dan tambahkan domain utama: `neoschola.floc.site`.

---

## Bagian 4: Konfigurasi DNS di Hostinger (dns-parking.com)

Kelola domain `floc.site` melalui DNS Zone Editor Hostinger dengan menambahkan 3 record CNAME berikut:

| Tipe | Nama Host / Subdomain | Target / Nilai Record | TTL | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `CNAME` | `neoschola` | Target CNAME dari Vercel (contoh: `cname.vercel-dns.com.`) | 300 / Auto | Landing Page |
| `CNAME` | `app.neoschola` | Target CNAME dari Vercel (contoh: `cname.vercel-dns.com.`) | 300 / Auto | Demo Web App |
| `CNAME` | `api.neoschola` | Target CNAME dari Railway (contoh: `xxxx.up.railway.app.`) | 300 / Auto | Backend API |

Pastikan propagasi DNS selesai diperiksa sebelum melakukan uji coba live traffic.

---

## Bagian 5: Reset Data Demo Harian & Smoke Test Live

### Otomasi Pembersihan Data Demo (Daily Cron)
Untuk menjaga integritas data simulasi agar tidak dipenuhi data uji coba publik secara berlebihan, jadwalkan reset data demo setiap hari pada pukul 03:00 WIB (ekivalen dengan pukul `20:00 UTC` / ekspresi cron `0 20 * * *`).

Skrip reset dijalankan dengan flag guard:
```bash
ALLOW_DEMO_RESET=true bun apps/api/src/db/resetDemo.ts
```

- **Implementasi Railway**: Buat service Cron Job terpisah dalam project Railway yang sama, pasang mount Volume `/data` yang sama, dan jadwalkan cron `0 20 * * *` dengan command di atas.
- **Implementasi VPS Mandiri**: Tambahkan baris berikut pada crontab host (`crontab -e`):
  ```crontab
  0 20 * * * docker exec -e ALLOW_DEMO_RESET=true neoschola-api bun apps/api/src/db/resetDemo.ts >> /var/log/neoschola-reset.log 2>&1
  ```

### Smoke Test Live Verifikasi

Setelah seluruh domain aktif dan sertifikat SSL/TLS terbit, jalankan serangkaian pengujian terminal berikut:

1. **Uji Kesehatan Backend API**:
   ```bash
   curl -fsS https://api.neoschola.floc.site/health
   ```
   Ekspektasi output JSON: `{"status":"ok",...}` dengan kode status HTTP 200.

2. **Uji Header Landing Page**:
   ```bash
   curl -I https://neoschola.floc.site
   ```
   Ekspektasi status HTTP 200 OK dengan security headers nosniff dan DENY.

3. **Uji Header Demo Web App**:
   ```bash
   curl -I https://app.neoschola.floc.site
   ```
   Ekspektasi status HTTP 200 OK.

4. **Uji Preflight CORS API**:
   ```bash
   curl -I -X OPTIONS https://api.neoschola.floc.site/api/auth/login \
     -H "Origin: https://app.neoschola.floc.site" \
     -H "Access-Control-Request-Method: POST"
   ```
   Ekspektasi response header:
   `access-control-allow-origin: https://app.neoschola.floc.site`
