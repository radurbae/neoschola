# NeoSchola: Arsitektur Sistem

NeoSchola adalah aplikasi penghubung sekolah dasar dan orang tua murid (fokus konteks sekolah dasar Indonesia, studi kasus demo: SDN Nusantara Harapan).

## 1. Arsitektur Monorepo

```
neoschola/
├── packages/
│   └── shared/          # Validasi Zod, types TypeScript, DTO kontrak, formatters
├── apps/
│   ├── api/             # Backend REST Bun + Hono + bun:sqlite + Web Crypto
│   └── mobile/          # Frontend Expo (React Native + Web) + Expo Router
├── docs/                # Dokumen arsitektur, desain UI/UX, dan kontrak API
├── package.json         # Workspaces root
└── tsconfig.base.json   # Konfigurasi TypeScript ketat bersama
```

### Prinsip Desain ("Ponytail Rule")
- **Keringkasan & Kelengkapan**: Kode seringkas mungkin tanpa abstraksi spekulatif, tetapi tetap 100% fungsional dan type-safe.
- **Zero-Bloat Dependencies**:
  - Database: Native `bun:sqlite` (in-memory untuk test, file tunggal untuk runtime).
  - Auth: Native Web Crypto API (`crypto.subtle`) untuk PBKDF2 (password hashing) dan HMAC-SHA256 (JWT token).
  - Validasi: `zod` tunggal yang di-share langsung antara API dan Mobile via `@neoschola/shared`.

---

## 2. Skema Database SQLite (15 Tabel)

Semua tabel menggunakan DDL idempoten (`CREATE TABLE IF NOT EXISTS`) dengan primary key integer auto-increment atau ULID/UUID teks, dan index yang relevan.

```
+--------------------+        +---------------------+
|       users        |<-------|       classes       |
| (admin,wali,guru)  |        | (homeroom_teacher)  |
+--------------------+        +---------------------+
          |                              |
          |                              v
          |                   +---------------------+
          +------------------>|       students      |
          |  guardian_students+---------------------+
          |                              |
          +------------------------------+
          |
          v
  +-----------------------------------------------------------+
  | attendances | leave_requests | schedules | assignments   |
  | grade_notes | announcements  | message_threads & messages |
  | invoices    | notifications                               |
  +-----------------------------------------------------------+
```

1. **`users`**: Akun pengguna sistem (Admin, Guru/Wali Kelas, Wali Murid).
   - `id` (TEXT PK), `email` (TEXT UNIQUE), `password_hash` (TEXT), `password_salt` (TEXT), `name` (TEXT), `role` (TEXT: GUARDIAN|TEACHER|ADMIN), `phone` (TEXT), `avatar_url` (TEXT), `created_at` (TEXT), `updated_at` (TEXT).
2. **`classes`**: Rombel/kelas sekolah (contoh: 4A, 2B).
   - `id` (TEXT PK), `name` (TEXT), `grade_level` (INTEGER), `academic_year` (TEXT), `homeroom_teacher_id` (TEXT FK -> users.id), `created_at` (TEXT).
3. **`students`**: Data peserta didik.
   - `id` (TEXT PK), `nis` (TEXT UNIQUE), `nisn` (TEXT UNIQUE), `full_name` (TEXT), `nickname` (TEXT), `class_id` (TEXT FK -> classes.id), `gender` (TEXT: L|P), `birth_date` (TEXT), `is_active` (INTEGER DEFAULT 1), `created_at` (TEXT).
4. **`guardian_students`**: Relasi orang tua/wali dengan siswa (kunci isolasi data).
   - `id` (TEXT PK), `guardian_id` (TEXT FK -> users.id), `student_id` (TEXT FK -> students.id), `relationship` (TEXT: AYAH|IBU|WALI), `is_primary` (INTEGER DEFAULT 1), `created_at` (TEXT).
5. **`attendances`**: Catatan presensi harian per siswa.
   - `id` (TEXT PK), `student_id` (TEXT FK -> students.id), `class_id` (TEXT FK -> classes.id), `date` (TEXT), `status` (TEXT: HADIR|SAKIT|IZIN|ALPA), `check_in_time` (TEXT), `check_out_time` (TEXT), `notes` (TEXT), `recorded_by` (TEXT FK -> users.id), `created_at` (TEXT).
6. **`leave_requests`**: Pengajuan izin/sakit oleh orang tua.
   - `id` (TEXT PK), `student_id` (TEXT FK -> students.id), `guardian_id` (TEXT FK -> users.id), `leave_type` (TEXT: SAKIT|IZIN), `start_date` (TEXT), `end_date` (TEXT), `reason` (TEXT), `attachment_url` (TEXT), `status` (TEXT: PENDING|APPROVED|REJECTED), `reviewed_by` (TEXT FK -> users.id), `reviewed_at` (TEXT), `review_notes` (TEXT), `created_at` (TEXT).
7. **`schedules`**: Jadwal pelajaran mingguan kelas.
   - `id` (TEXT PK), `class_id` (TEXT FK -> classes.id), `day_of_week` (TEXT: SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU), `start_time` (TEXT), `end_time` (TEXT), `subject` (TEXT), `teacher_name` (TEXT), `room` (TEXT), `created_at` (TEXT).
8. **`assignments`**: Tugas dan pekerjaan rumah siswa.
   - `id` (TEXT PK), `class_id` (TEXT FK -> classes.id), `title` (TEXT), `description` (TEXT), `subject` (TEXT), `due_date` (TEXT), `assigned_by` (TEXT FK -> users.id), `created_at` (TEXT).
9. **`grade_notes`**: Catatan capaian dan nilai siswa dari guru.
   - `id` (TEXT PK), `student_id` (TEXT FK -> students.id), `subject` (TEXT), `semester` (INTEGER), `academic_year` (TEXT), `score` (REAL), `notes` (TEXT), `teacher_id` (TEXT FK -> users.id), `created_at` (TEXT).
10. **`announcements`**: Pengumuman sekolah & kelas.
    - `id` (TEXT PK), `title` (TEXT), `content` (TEXT), `category` (TEXT: DARURAT|SEKOLAH|KELAS|KEGIATAN), `target_role` (TEXT: ALL|GUARDIAN|TEACHER), `class_id` (TEXT FK -> classes.id, NULL = semua kelas), `is_pinned` (INTEGER DEFAULT 0), `created_by` (TEXT FK -> users.id), `created_at` (TEXT).
11. **`announcement_reads`**: Jejak baca pengumuman oleh orang tua/guru.
    - `id` (TEXT PK), `announcement_id` (TEXT FK -> announcements.id), `user_id` (TEXT FK -> users.id), `read_at` (TEXT).
12. **`message_threads`**: Percakapan privat orang tua & guru seputar siswa.
    - `id` (TEXT PK), `student_id` (TEXT FK -> students.id), `guardian_id` (TEXT FK -> users.id), `teacher_id` (TEXT FK -> users.id), `subject` (TEXT), `last_message_at` (TEXT), `created_at` (TEXT).
13. **`messages`**: Pesan dalam thread.
    - `id` (TEXT PK), `thread_id` (TEXT FK -> message_threads.id), `sender_id` (TEXT FK -> users.id), `content` (TEXT), `is_read` (INTEGER DEFAULT 0), `created_at` (TEXT).
14. **`invoices`**: Tagihan SPP & kegiatan sekolah.
    - `id` (TEXT PK), `student_id` (TEXT FK -> students.id), `title` (TEXT), `description` (TEXT), `amount` (REAL), `due_date` (TEXT), `status` (TEXT: UNPAID|WAITING_VERIFICATION|PAID|OVERDUE|REJECTED), `payment_proof_url` (TEXT), `paid_at` (TEXT), `verified_by` (TEXT FK -> users.id), `verified_at` (TEXT), `created_at` (TEXT).
15. **`notifications`**: Notifikasi in-app untuk pengguna.
    - `id` (TEXT PK), `user_id` (TEXT FK -> users.id), `title` (TEXT), `body` (TEXT), `type` (TEXT: PRESENSI|IZIN|PENGUMUMAN|PESAN|TAGIHAN|AKADEMIK), `reference_id` (TEXT), `is_read` (INTEGER DEFAULT 0), `created_at` (TEXT).

---

## 3. Aturan RBAC & Isolasi Data Anak

Keamanan data anak sekolah dasar adalah prioritas mutlak. Tiga role utama:

1. **`GUARDIAN` (Orang Tua / Wali Murid)**
   - **Isolasi Anak**: Hanya dapat melihat data siswa yang terhubung secara eksplisit pada tabel `guardian_students` (`guardian_id = auth.user.id`).
   - Upaya membaca atau memodifikasi data `student_id` milik anak lain langsung ditolak dengan `403 Forbidden` (`FORBIDDEN_STUDENT_ACCESS`).
   - Dapat mengajukan izin (`leave_requests`), membaca presensi/jadwal/tugas/nilai anak mereka, mengirim pesan ke wali kelas anak, dan mengunggah bukti bayar tagihan anak.
2. **`TEACHER` (Guru / Wali Kelas)**
   - Mengelola presensi, melihat jadwal, membuat tugas, memberi nilai, dan meninjau izin untuk siswa di kelas yang diampu (`homeroom_teacher_id = auth.user.id` pada tabel `classes`).
   - Berkomunikasi dengan orang tua siswa di kelasnya via `message_threads`.
3. **`ADMIN` (Tata Usaha / Pengelola Sekolah)**
   - Memiliki visibilitas penuh terhadap seluruh kelas, siswa, presensi, verifikasi tagihan SPP, dan penerbitan pengumuman level sekolah.

---

## 4. Akun Demo Sintetis (SDN Nusantara Harapan)

Seluruh password akun demo: `neoschola123`

| Email | Role | Nama | Keterangan / Asosiasi |
|---|---|---|---|
| `wali.budi@neoschola.demo` | `GUARDIAN` | Budi Santoso | Wali murid dari 2 anak: **Raka Pratama** (Kelas 4A) & **Nadia Putri** (Kelas 2B) |
| `wali.siti@neoschola.demo` | `GUARDIAN` | Siti Rahmawati | Wali murid dari 1 anak: **Dimas Mahendra** (Kelas 4A) |
| `guru.ani@neoschola.demo` | `TEACHER` | Ani Wijayanti, S.Pd. | Wali Kelas 4A (mengajar Raka Pratama & Dimas Mahendra) |
| `admin.tu@neoschola.demo` | `ADMIN` | Hendra Setiawan | Staf Tata Usaha SDN Nusantara Harapan |

---

## 5. Rencana Pemisahan Aplikasi per Jenis Akun

Saat ini seluruh peran (`GUARDIAN`, `TEACHER`, `ADMIN`) masih berada di dalam satu bundel `apps/mobile` untuk memudahkan pengujian terpadu. Untuk pemisahan aplikasi per jenis akun di kemudian hari, arsitektur berkembang bertahap:

1. **Tahap 1: Konfigurasi Varian Build (Aktif Sekarang via `EXPO_PUBLIC_APP_VARIANT`)**
   - `apps/mobile/src/config/appVariant.ts` mengatur mode varian: `"all"` (terpadu saat ini), `"guardian"` (`NeoSchola Wali`), `"teacher"` (`NeoSchola Guru`), `"admin"` (`NeoSchola Admin`), dan `"staff"` (`NeoSchola Staf`).
   - `AuthProvider` dan `app/login.tsx` sudah membatasi daftar akun uji coba serta akses login berdasarkan varian aktif dan mengarahkan rute rumah/profil menggunakan helper peran.
2. **Tahap 2: Multi-Flavor Native Build (EAS & `app.config.ts`)**
   - Ganti `apps/mobile/app.json` menjadi `app.config.ts` yang membaca `EXPO_PUBLIC_APP_VARIANT` untuk membedakan `name`, `slug`, `scheme`, ikon, serta `bundleIdentifier` / Android `package` terpisah (`id.neoschola.wali`, `id.neoschola.guru`, `id.neoschola.admin`) dari satu kode sumber.
3. **Tahap 3: Pemisahan Paket Workspace Mandiri**
   - Ekstrak modul inti (`src/theme`, `src/components`, `src/lib`, `src/store`, `src/features/profile`) ke workspace `packages/mobile-core`.
   - Pisahkan entry point Expo Router menjadi `apps/mobile-wali` (`app/(tabs)` + layar komunikasi wali), `apps/mobile-guru` (presensi kelas, izin, pengumuman, akademik, pesan), dan `apps/mobile-admin` (pengumuman, keuangan SPP, pesan), dengan semua aplikasi tetap berbagi `@neoschola/shared` dan `apps/api`.
