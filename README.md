# NeoSchola

Portal aplikasi mobile penghubung wali murid dan pihak sekolah (studi kasus sintetis **SDN Nusantara Harapan**). Seluruh data demo bersifat 100% fiktif untuk pengujian lokal.

## Struktur Monorepo

```text
neoschola/
├── packages/shared/   # Kontrak tipe TypeScript, skema Zod, formatter Rupiah & tanggal Indonesia
├── apps/api/          # Backend REST API (Hono + Zod + bun:sqlite + Web Crypto JWT/PBKDF2)
├── apps/mobile/       # Aplikasi mobile (Expo Router + React Native + React Native Web)
├── docs/              # Arsitektur, sistem desain, dan spesifikasi kontrak REST API
└── anti-slop/         # Laporan audit kualitas UI, aksesibilitas, copy, dan komentar kode
```

Dokumentasi utama:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- [docs/DESIGN.md](docs/DESIGN.md)
- [anti-slop/audit-001.md](anti-slop/audit-001.md)
- [anti-slop/audit-002.md](anti-slop/audit-002.md)

## Menjalankan Secara Lokal

### 1. Instalasi Dependensi

```bash
npm install
```

### 2. Menjalankan Backend API (`http://localhost:3001`)

Server otomatis menginisialisasi skema SQLite (`apps/api/data/neoschola.sqlite`) dan mengisi data demo sintetis saat database kosong:

```bash
npm --workspace=apps/api run dev
# atau langsung dengan Bun:
cd apps/api && bun run src/index.ts
```

### 3. Menjalankan Aplikasi Mobile

- **Expo Web (preview browser)**:
  ```bash
  npm --workspace=apps/mobile run web
  ```
- **Expo Go / Perangkat Android via `adb`**:
  ```bash
  npm --workspace=apps/mobile run start
  ```
  Jika mengakses API dari perangkat fisik di jaringan LAN, atur alamat IP komputer Anda sebelum menjalankan Expo:
  ```bash
  EXPO_PUBLIC_API_URL=http://192.168.x.x:3001 npm --workspace=apps/mobile run start
  ```

## Akun Demo Sintetis

Kata sandi untuk seluruh akun demo: `neoschola123`

| Peran | Email | Cakupan Data |
| :--- | :--- | :--- |
| Wali Murid (2 Anak) | `wali.budi@neoschola.demo` | Budi Santoso (Raka Pratama 4A & Nadia Putri 2B) |
| Wali Murid (1 Anak) | `wali.siti@neoschola.demo` | Siti Rahmawati (Dimas Mahendra 4A) |
| Wali Kelas 4A | `guru.ani@neoschola.demo` | Ani Wijayanti, S.Pd. (Kelas 4A) |
| Admin Tata Usaha | `admin.tu@neoschola.demo` | Hendra Setiawan (Lintas kelas & verifikasi SPP) |

## Pengujian & Build Check

```bash
npm run typecheck
(cd packages/shared && bun test)
(cd apps/api && bun test)
npm run build:mobile:web
```
