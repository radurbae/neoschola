# Panduan Deploy Demo NeoSchola

Dokumen ini menjelaskan prosedur deployment backend NeoSchola API (Docker), web application mobile, landing page, dan otomasi pembersihan data demo.

## 1. Arsitektur Deployment

- **API Backend**: Docker container Bun berjalan di VPS / PaaS (Fly.io, Railway, atau VPS mandiri) dengan persistent volume pada direktori `/data`.
- **Frontend Web & Landing**: Static export di-host melalui Cloudflare Pages atau Vercel.
- **Database**: SQLite lokal yang tersimpan di `/data/neoschola.sqlite`.

---

## 2. Deploy API via Docker

### Build Docker Image
Jalankan perintah build dari root monorepo:
```bash
docker build -f apps/api/Dockerfile -t neoschola-api:latest .
```

### Menjalankan Container (VPS Mandiri)
Siapkan persistent storage dan jalankan container:
```bash
mkdir -p /srv/neoschola/data
chown -R 1000:1000 /srv/neoschola/data

docker run -d \
  --name neoschola-api \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /srv/neoschola/data:/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DATABASE_PATH=/data/neoschola.sqlite \
  -e JWT_SECRET="masukkan-kunci-rahasia-jwt-minimal-32-karakter-acak" \
  -e CORS_ORIGIN="https://neoschola.floc.site" \
  -e SEED_DEMO_DATA=true \
  -e ALLOW_DEMO_RESET=false \
  neoschola-api:latest
```
*(Catatan: tambahkan origin landing page dipisahkan koma jika domain landing page berbeda dari demo app).*

### Deploy ke Fly.io / Railway
- Pasang Persistent Volume mount pada path `/data` (ukuran 1 GB cukup untuk SQLite demo).
- Set Environment Variables: `NODE_ENV=production`, `PORT=3001`, `DATABASE_PATH=/data/neoschola.sqlite`, `JWT_SECRET` (>= 32 karakter), `CORS_ORIGIN`.

---

## 3. Reverse Proxy & HTTPS (Nginx / Caddy)

Pastikan backend berjalan di balik reverse proxy HTTPS.

### Contoh Konfigurasi Caddy
```caddy
api.neoschola.floc.site {
    reverse_proxy 127.0.0.1:3001 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
    }
}
```

### Contoh Konfigurasi Nginx
```nginx
server {
    server_name api.neoschola.floc.site;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Build & Deploy Frontend

### A. Mobile Web App (Expo Web)
1. Salin konfigurasi environment:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```
2. Isi `EXPO_PUBLIC_API_URL=https://api.neoschola.floc.site` dan `EXPO_PUBLIC_DEMO_MODE=true`.
3. Build static web bundle:
   ```bash
   npm run build:mobile:web
   ```
4. Output tersimpan di `apps/mobile/dist`. Deploy direktori ini ke Cloudflare Pages atau Vercel.

### B. Landing Page
Folder `apps/landing/` berisi file statis murni (HTML/CSS/JS) tanpa tahap build.
Cukup upload atau deploy direktori `apps/landing` secara langsung ke Cloudflare Pages, Vercel, atau static host pilihan Anda.

---

## 5. Otomasi Reset Database Demo (Cron Job)

Untuk menjaga data akun demo tetap konsisten setiap hari, pasang cron job harian pada jam 03:00 WIB (pukul 20:00 UTC).

### Menjalankan di dalam Container Aktif
Jalankan perintah ini di host cron (`crontab -e`):
```cron
0 20 * * * docker exec -e ALLOW_DEMO_RESET=true neoschola-api bun apps/api/src/db/resetDemo.ts >> /var/log/neoschola-reset.log 2>&1
```

### Menjalankan via Local Bun CLI
Jika menggunakan VPS tanpa container:
```cron
0 20 * * * cd /srv/neoschola/apps/api && ALLOW_DEMO_RESET=true bun src/db/resetDemo.ts >> /var/log/neoschola-reset.log 2>&1
```
