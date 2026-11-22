# NeoSchola: Panduan Desain & Token UI/UX

Panduan desain visual, interaksi, dan sistem token untuk aplikasi mobile & web NeoSchola.

## 1. Filosofi Desain
- **Konteks Indonesia**: Ramah, hangat, terpercaya, dan mudah dipahami oleh orang tua murid dengan beragam tingkat literasi digital.
- **Tenang & Jelas**: Menghindari beban kognitif berlebih bagi orang tua yang terburu-buru di pagi hari saat mengantar anak atau mengecek presensi.
- **Aksesibilitas Utama**:
  - Semua area sentuh (*tap target*) minimal **44pt x 44pt**.
  - Kontras teks terhadap latar belakang minimal **4.5:1** (standar WCAG 2.1 AA).
  - Teks berbahasa Indonesia yang alami, sopan, dan tidak menggunakan jargon teknis.

---

## 2. Token Warna

| Token | Hex | Penggunaan | Rasio Kontras |
|---|---|---|---|
| `canvas` | `#F7F9F8` | Latar belakang layar aplikasi (sedikit warm tint) | Dasar |
| `card` | `#FFFFFF` | Permukaan kartu, modal, header bar | Kontras tinggi |
| `border` | `#E2E8F0` | Garis pemisah, outline kartu dan input | Cukup terlihat |
| `borderFocus` | `#166534` | Garis seleksi/fokus input | Jelas |
| `primary` | `#166534` | Tombol utama, tab aktif, identitas hijau sekolah | 7.4:1 terhadap `#FFFFFF` |
| `pressed` | `#14532D` | Status tombol saat ditekan | Sangat tinggi |
| `soft` | `#ECFDF5` | Latar belakang aksen lembut, banner sukses | Nyaman |
| `textPrimary` | `#0F172A` | Judul, label utama, angka penting | 14.8:1 terhadap `#FFFFFF` |
| `textSecondary`| `#475569` | Keterangan, waktu, deskripsi sekunder | 5.3:1 terhadap `#FFFFFF` |
| `textMuted` | `#94A3B8` | Placeholder, teks non-aktif | 4.5:1 terhadap `#0F172A` |

### Semantic Badges (Status Chips)

Setiap lencana status wajib memiliki kontras teks terhadap latar belakang badge >= 4.5:1:

| Status / Kategori | Background | Text | Border | Contoh Penggunaan |
|---|---|---|---|---|
| **Success** | `#DCFCE7` | `#166534` | `#BBF7D0` | Hadir, Disetujui, Lunas |
| **Warning** | `#FEF9C3` | `#854D0E` | `#FEF08A` | Izin, Menunggu Verifikasi |
| **Info** | `#DBEAFE` | `#1E40AF` | `#BFDBFE` | Sakit, Pengumuman Kelas |
| **Danger** | `#FEE2E2` | `#991B1B` | `#FECACA` | Alpa, Darurat, Jatuh Tempo, Ditolak |

---

## 3. Tipografi

Sistem tipografi menggunakan font sistem lokal (`System` / `-apple-system`, `Roboto`, sans-serif) untuk performa instan tanpa download aset web-font:

| Skala | Ukuran | Line Height | Weight | Penggunaan |
|---|---|---|---|---|
| `xs` | 12pt | 16pt | Regular (400) / Medium (500) | Timestamp, keterangan kecil, badge |
| `sm` | 14pt | 20pt | Regular (400) / Medium (500) | Label formulir, subteks, kartu ringkas |
| `base` | 16pt | 24pt | Regular (400) / SemiBold (600) | Isi paragraf, teks tombol, nilai input |
| `lg` | 18pt | 26pt | SemiBold (600) | Judul kartu, sub-header |
| `xl` | 20pt | 28pt | Bold (700) | Judul bagian, nama anak di dashboard |
| `2xl` | 24pt | 32pt | Bold (700) | Judul layar utama |
| `3xl` | 30pt | 38pt | Bold (800) | Header hero, ucapan selamat pagi |

---

## 4. Spasi & Radius

- **Spasi**: Skala 4pt (`4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`).
- **Radius Sudut**:
  - `sm`: 6pt (Badge, tag kecil)
  - `md`: 10pt (Input form, kartu kecil)
  - `lg`: 14pt (Kartu dashboard, bottom sheet)
  - `full`: 9999pt (Avatar bulat, tombol pill)

---

## 5. Konvensi Teks & Bahasa Indonesia Alami

- **Salam ramah**: *"Selamat Pagi, Pak Budi"* (bukan *"Halo Pengguna"*).
- **Aksi jelas**: *"Ajukan Surat Izin"*, *"Kirim Bukti Bayar"*, *"Tandai Dibaca"*.
- **Konfirmasi santun**: *"Apakah Anda yakin ingin membatalkan pengajuan ini?"*
- **Penulisan Mata Uang**: Menggunakan format baku Rupiah, contoh `Rp 250.000`.
- **Penulisan Tanggal**: Menggunakan nama hari dan bulan Indonesia, contoh `Senin, 24 November 2026`.
