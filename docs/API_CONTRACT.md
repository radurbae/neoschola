# NeoSchola: Kontrak Spesifikasi REST API

Format dasar pertukaran data: JSON (`Content-Type: application/json`).
Autentikasi: HTTP Header `Authorization: Bearer <token_jwt>`.

### Format Respon Standar
- **Sukses**: Langsung mengembalikan objek atau daftar entitas yang diminta, misal `{ user: {...} }` atau `{ items: [...] }`.
- **Gagal**:
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Sesi Anda telah berakhir. Silakan masuk kembali."
    }
  }
  ```

---

## 1. Health Check

### `GET /health`
- **Auth**: Tidak perlu
- **Response 200**:
  ```json
  {
    "ok": true,
    "service": "neoschola-api"
  }
  ```

---

## 2. Autentikasi (`/api/auth`)

### `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "wali.budi@neoschola.demo",
    "password": "neoschola123"
  }
  ```
- **Response 200**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr_budi",
      "email": "wali.budi@neoschola.demo",
      "name": "Budi Santoso",
      "role": "GUARDIAN",
      "phone": "081234567890",
      "avatar_url": null
    }
  }
  ```
- **Error 401**: `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Email atau kata sandi tidak cocok." } }`

### `GET /api/auth/me`
- **Auth**: Wajib (Semua Role)
- **Response 200**: `{ "user": { ... } }`

---

## 3. Peserta Didik (`/api/students`)

### `GET /api/students`
- **Auth**: Wajib
- **Peran**:
  - `GUARDIAN`: Mengembalikan hanya anak yang terdaftar di `guardian_students`.
  - `TEACHER`: Mengembalikan siswa di kelas binaan guru tersebut.
  - `ADMIN`: Mengembalikan semua siswa.
- **Response 200**:
  ```json
  {
    "students": [
      {
        "id": "std_raka",
        "nis": "202404001",
        "nisn": "0123456789",
        "full_name": "Raka Pratama",
        "nickname": "Raka",
        "class_id": "cls_4a",
        "class_name": "Kelas 4A",
        "gender": "L",
        "birth_date": "2016-04-12",
        "is_active": true
      }
    ]
  }
  ```

### `GET /api/students/:id/dashboard`
- **Auth**: Wajib (Isolasi anak diverifikasi)
- **Response 200**:
  ```json
  {
    "student": { ... },
    "attendance_today": {
      "status": "HADIR",
      "check_in_time": "06:48",
      "check_out_time": null
    },
    "attendance_summary": {
      "hadir": 18,
      "sakit": 1,
      "izin": 1,
      "alpa": 0,
      "percentage": 90.0
    },
    "schedules_today": [
      { "subject": "Matematika", "start_time": "07:30", "end_time": "09:00", "room": "Ruang 4A" }
    ],
    "assignments_active": [
      { "id": "asg_1", "title": "Latihan Pecahan", "due_date": "2026-11-25", "subject": "Matematika" }
    ],
    "unread_announcements_count": 2,
    "unpaid_invoices_count": 1
  }
  ```

---

## 4. Presensi (`/api/attendance`)

### `GET /api/attendance`
- **Query**: `student_id` (wajib bagi GUARDIAN), `month` (format `YYYY-MM`), `from`, `to`
- **Response 200**: `{ "items": [ { "id": "att_1", "date": "2026-11-24", "status": "HADIR", ... } ] }`

### `GET /api/attendance/class`
- **Auth**: `TEACHER`, `ADMIN`
- **Query**: `class_id` (wajib), `date` (`YYYY-MM-DD`, default hari ini)
- **Response 200**: `{ "class_id": "cls_4a", "date": "2026-11-24", "items": [ { "student_id": "std_raka", "status": "HADIR", ... } ] }`

### `POST /api/attendance/bulk`
- **Auth**: `TEACHER`, `ADMIN`
- **Body**:
  ```json
  {
    "class_id": "cls_4a",
    "date": "2026-11-24",
    "attendances": [
      { "student_id": "std_raka", "status": "HADIR", "notes": "" },
      { "student_id": "std_dimas", "status": "HADIR", "notes": "" }
    ]
  }
  ```
- **Response 200**: `{ "success": true, "recorded_count": 2 }`

---

## 5. Pengajuan Izin (`/api/leave-requests`)

### `GET /api/leave-requests`
- **Query**: `student_id` (opsional untuk filter)
- **Response 200**: `{ "items": [ ... ] }`

### `POST /api/leave-requests`
- **Auth**: `GUARDIAN` (Wajib terhubung dengan siswa)
- **Body**:
  ```json
  {
    "student_id": "std_raka",
    "leave_type": "SAKIT",
    "start_date": "2026-11-25",
    "end_date": "2026-11-26",
    "reason": "Demam tinggi sejak malam",
    "attachment_url": null
  }
  ```
- **Response 201**: `{ "leave_request": { "id": "lvr_1", ... } }`

### `PATCH /api/leave-requests/:id/review`
- **Auth**: `TEACHER`, `ADMIN`
- **Body**:
  ```json
  {
    "status": "APPROVED",
    "review_notes": "Semoga lekas sembuh, Raka."
  }
  ```
- **Response 200**: `{ "leave_request": { ... } }`

---

## 6. Akademik (`/api/academic`)

### `GET /api/academic/schedule`
- **Query**: `class_id` atau `student_id`
- **Response 200**: `{ "schedules": [ ... ] }`

### `GET /api/academic/assignments`
- **Query**: `class_id` atau `student_id`
- **Response 200**: `{ "assignments": [ ... ] }`

### `POST /api/academic/assignments`
- **Auth**: `TEACHER`, `ADMIN`
- **Body**: `{ "class_id": "cls_4a", "title": "...", "description": "...", "subject": "...", "due_date": "2026-11-28" }`
- **Response 201**: `{ "assignment": { ... } }`

### `GET /api/academic/grades`
- **Query**: `student_id` (wajib)
- **Response 200**: `{ "grades": [ ... ] }`

### `POST /api/academic/grades`
- **Auth**: `TEACHER`, `ADMIN`
- **Body**: `{ "student_id": "std_raka", "subject": "Matematika", "semester": 1, "academic_year": "2026/2027", "score": 88, "notes": "Sangat baik" }`
- **Response 201**: `{ "grade_note": { ... } }`

---

## 7. Pengumuman (`/api/announcements`)

### `GET /api/announcements`
- **Query**: `class_id` (opsional)
- **Response 200**: `{ "announcements": [ ... ] }`

### `POST /api/announcements`
- **Auth**: `TEACHER`, `ADMIN`
- **Body**:
  ```json
  {
    "title": "Peringatan Hari Guru Nasional",
    "content": "Siswa mengenakan seragam batik bebas rapi.",
    "category": "KEGIATAN",
    "target_role": "ALL",
    "class_id": null,
    "is_pinned": true
  }
  ```
- **Response 201**: `{ "announcement": { ... } }`

### `POST /api/announcements/:id/ack`
- **Auth**: Wajib
- **Response 200**: `{ "success": true, "read_at": "2026-11-24T08:00:00Z" }`

---

## 8. Pesan Langsung (`/api/threads`)

### `GET /api/threads`
- **Response 200**: `{ "threads": [ ... ] }`

### `POST /api/threads`
- **Body**: `{ "student_id": "std_raka", "teacher_id": "usr_ani", "subject": "Konsultasi Belajar", "initial_message": "..." }`
- **Response 201**: `{ "thread": { ... } }`

### `GET /api/threads/:id/messages`
- **Response 200**: `{ "messages": [ ... ] }`

### `POST /api/threads/:id/messages`
- **Body**: `{ "content": "Terima kasih atas infonya Bu Guru." }`
- **Response 201**: `{ "message": { ... } }`

### `POST /api/threads/:id/read`
- **Response 200**: `{ "success": true }`

---

## 9. Tagihan & Keuangan (`/api/invoices`)

### `GET /api/invoices`
- **Query**: `student_id` (opsional)
- **Response 200**: `{ "invoices": [ ... ] }`

### `POST /api/invoices`
- **Auth**: `ADMIN`
- **Body**: `{ "student_id": "std_raka", "title": "SPP November 2026", "amount": 250000, "due_date": "2026-11-30" }`
- **Response 201**: `{ "invoice": { ... } }`

### `POST /api/invoices/:id/submit-payment`
- **Auth**: `GUARDIAN`
- **Body**: `{ "payment_method": "TRANSFER_BANK", "payment_ref": "TRF-123456", "proof_note": "Transfer BCA a.n. Budi", "payment_proof_url": "https://..." }` (minimal salah satu dari `payment_proof_url`, `payment_ref`, atau `proof_note` wajib diisi)
- **Response 200**: `{ "invoice": { ... } }`

### `PATCH /api/invoices/:id/verify`
- **Auth**: `ADMIN`
- **Body**: `{ "status": "PAID", "notes": "Opsional catatan verifikasi" }`
- **Response 200**: `{ "invoice": { ... } }` (jika `PAID`, menyertakan `receipt_no` format `KW-YYYYMM-XXXX`)

---

## 10. Notifikasi (`/api/notifications`)

### `GET /api/notifications`
- **Response 200**: `{ "notifications": [ ... ], "unread_count": 3 }`

### `PATCH /api/notifications/:id/read`
- **Response 200**: `{ "success": true }`

### `POST /api/notifications/read-all`
- **Response 200**: `{ "success": true, "updated_count": 3 }`
