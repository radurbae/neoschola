# NeoSchola: Panduan Desain & Sistem Token UI/UX

Panduan desain visual, interaksi, dan sistem token untuk aplikasi mobile dan web NeoSchola berbasis **ui.shadcn.com (Zinc Base / New York Style)**.

## 1. Prinsip Desain

1. **Monokrom Tenang (Zinc Base)**
   Antarmuka menggunakan palet monokrom Zinc netral yang jernih dan profesional. Latar belakang putih bersih dan abu-abu sangat muda dipadukan dengan teks hitam pekat untuk menciptakan ketenangan visual bagi orang tua murid dan staf sekolah.
2. **Presisi Hairline Border**
   Menghindari bayangan berat yang kotor. Struktur visual dibangun menggunakan garis batas tipis 1px (`#E4E4E7`) yang presisi dengan bayangan mikro (whisper shadow) yang sangat halus.
3. **Ruang Napas Lega (Whitespace)**
   Setiap elemen diberi jarak yang proporsional sehingga informasi tersaji rapi, mudah dipindai dengan cepat di layar ponsel, dan tidak menimbulkan kesan sesak.
4. **Aksen Semantik Terkendali**
   Warna fungsional hanya digunakan untuk status yang bermakna (sukses, peringatan, info, bahaya). Tidak ada warna mencolok yang digunakan tanpa tujuan hierarki informasi.
5. **Aksesibilitas Utama**
   - Semua target sentuh (tap target) memiliki ukuran minimal **44pt x 44pt** (`minHeight: 44`).
   - Rasio kontras teks terhadap latar belakang wajib memenuhi standar WCAG 2.1 AA (minimal **4.5:1**).
6. **Bahasa Indonesia Hangat dan Sopan**
   Seluruh copy dan komunikasi menggunakan Bahasa Indonesia yang ramah, santun, jelas, dan tanpa istilah teknis asing yang membingungkan.

---

## 2. Token Semantik shadcn/ui

Berikut adalah tabel lengkap token semantik Zinc New York Style yang digunakan pada NeoSchola:

| Token | Nilai Hex | Fungsi / Penggunaan | Rasio Kontras |
|---|---|---|---|
| `background` | `#FFFFFF` | Latar belakang dasar permukaan kartu dan modal | Dasar |
| `canvas` | `#FAFAFA` | Latar belakang kanvas layar aplikasi (Zinc-50) | Dasar |
| `foreground` | `#09090B` | Teks utama, judul, dan elemen kontras tertinggi (Zinc-950) | 19.8:1 terhadap `#FFFFFF` |
| `card` | `#FFFFFF` | Permukaan kartu komponen | Kontras tinggi |
| `cardForeground` | `#09090B` | Teks di atas kartu | 19.8:1 terhadap `#FFFFFF` |
| `popover` | `#FFFFFF` | Permukaan menu mengambang, dropdown, tooltip | Kontras tinggi |
| `popoverForeground` | `#09090B` | Teks di atas popover | 19.8:1 terhadap `#FFFFFF` |
| `primary` | `#18181B` | Tombol utama, tab aktif, seleksi penting (Zinc-900) | 17.7:1 terhadap `#FFFFFF` |
| `primaryPressed` | `#27272A` | Status tombol utama saat ditekan (Zinc-800) | 15.3:1 terhadap `#FFFFFF` |
| `primaryForeground` | `#FAFAFA` | Teks di atas tombol utama (Zinc-50) | 17.1:1 terhadap `#18181B` |
| `secondary` | `#F4F4F5` | Tombol alternatif, latar belakang chip/pill (Zinc-100) | Netral |
| `secondaryPressed` | `#E4E4E7` | Status tombol sekunder saat ditekan (Zinc-200) | Terlihat jelas |
| `secondaryForeground` | `#18181B` | Teks di atas tombol sekunder | 15.8:1 terhadap `#F4F4F5` |
| `muted` | `#F4F4F5` | Latar belakang elemen nonaktif atau selingan | Netral |
| `mutedForeground` | `#52525B` | Teks keterangan, timestamp, placeholder (Zinc-600) | 7.1:1 terhadap `#FFFFFF`, 6.4:1 terhadap `#F4F4F5` |
| `accent` | `#F4F4F5` | Sorotan hover atau seleksi lembut | Netral |
| `accentForeground` | `#18181B` | Teks pada elemen aksen | 15.8:1 terhadap `#F4F4F5` |
| `destructive` | `#DC2626` | Tombol bahaya, aksi hapus, status fatal (Red-600) | 4.6:1 terhadap `#FFFFFF` |
| `destructivePressed` | `#B91C1C` | Tombol bahaya saat ditekan (Red-700) | 5.9:1 terhadap `#FFFFFF` |
| `destructiveForeground` | `#FAFAFA` | Teks di atas tombol bahaya | 4.5:1 terhadap `#DC2626` |
| `border` | `#E4E4E7` | Garis batas hairline komponen dan pemisah (Zinc-200) | Garis presisi 1px |
| `input` | `#E4E4E7` | Garis batas input formulir | Presisi 1px |
| `ring` | `#18181B` | Indikator fokus aktif pada input dan tombol | Jelas dan tegas |

### Status Semantik Terkendali (Semantic Badges)

Seluruh lencana status wajib memenuhi kontras teks terhadap latar belakang minimal 4.5:1 (WCAG AA):

| Status / Varian | Background | Text | Border | Contoh Penggunaan |
|---|---|---|---|---|
| **Success** | `#F0FDF4` | `#15803D` | `#BBF7D0` | Hadir tepat waktu, pembayaran lunas, verifikasi disetujui |
| **Warning** | `#FFFBEB` | `#92400E` | `#FDE68A` | Izin disetujui, menunggu verifikasi, batas waktu dekat |
| **Info** | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | Sakit dalam pemulihan, pengumuman sekolah, informasi kelas |
| **Danger** | `#FEF2F2` | `#B91C1C` | `#FECACA` | Alpa, pembayaran jatuh tempo, pengajuan ditolak |
| **Neutral** | `#F4F4F5` | `#3F3F46` | `#E4E4E7` | Draf simpanan, arsip lama, status belum dimulai |

---

## 3. Geometri, Elevasi, dan Tipografi

### Radius Sudut (Border Radius)
Mengikuti standar `--radius: 8px` dari shadcn/ui:
- `sm: 6pt`: Lencana status (Badge), tag kecil, trigger tabs.
- `md: 8pt`: Tombol standar, kolom input, container tabs, kotak peringatan (Alert).
- `lg: 12pt`: Kartu konten (Card), wadah navigasi, daftar grup.
- `full: 9999pt`: Avatar inisial, tombol ikon bulat, pill status.

### Elevasi Halus (Whisper Shadow)
Aplikasi menghindari bayangan tebal. Semua elevasi dipadukan dengan border 1px `#E4E4E7`:
- **None**: Tanpa bayangan untuk elemen datar.
- **XS (Whisper Shadow)**:
  - iOS: `shadowColor: "#09090B"`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.04`, `shadowRadius: 2`
  - Android: `elevation: 1`
  - Web: `boxShadow: "0 1px 2px rgba(9, 9, 11, 0.04)"`
- **SM (Card & Sheet Shadow)**:
  - iOS: `shadowColor: "#09090B"`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.06`, `shadowRadius: 3`
  - Android: `elevation: 2`
  - Web: `boxShadow: "0 1px 3px rgba(9, 9, 11, 0.06)"`

### Tipografi Sistem Native
Menggunakan font sistem native (San Francisco pada iOS, Roboto pada Android) untuk rendering instan tanpa jeda unduh:
- **Heading**: Bobot `semibold` (600) dengan letter spacing negatif:
  - Judul layar utama: `fontSize: 20pt` atau `24pt`, `letterSpacing: -0.4`.
  - Judul kartu dan seksi: `fontSize: 16pt` atau `18pt`, `letterSpacing: -0.2`.
- **Angka Finansial dan Jam**: Seluruh tampilan mata uang (Rupiah), jam presensi, dan skor akademik wajib menggunakan `fontVariant: ["tabular-nums"]` agar angka sejajar secara vertikal.

---

## 4. Katalog Komponen ui.shadcn.com Native

1. **Button**
   - Varian:
     - `default`: Latar `#18181B`, teks `#FAFAFA`. Digunakan untuk aksi primer layar.
     - `secondary`: Latar `#F4F4F5`, teks `#18181B`. Digunakan untuk aksi pendukung.
     - `outline`: Latar `#FFFFFF`, border `#E4E4E7`, teks `#09090B`.
     - `ghost`: Transparan, teks `#09090B`, latar berubah ke `#F4F4F5` saat ditekan.
     - `destructive`: Latar `#DC2626`, teks `#FAFAFA`.
     - `link`: Transparan tanpa padding samping, teks bergaris bawah.
   - Ukuran:
     - `sm`: Padding horizontal 12pt, tinggi minimal 44pt, teks 13pt.
     - `default` (atau `md`): Padding horizontal 16pt, tinggi minimal 44pt, teks 14pt.
     - `lg`: Padding horizontal 20pt, tinggi minimal 48pt, teks 16pt.
     - `icon`: Ukuran 44pt x 44pt untuk tombol aksi berbentuk ikon.
2. **Card**
   - Komponen terstruktur: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
   - Latar `#FFFFFF`, border 1px `#E4E4E7`, radius 12pt (`radius.lg`), whisper shadow.
3. **Badge**
   - Varian: `default`, `secondary`, `outline`, `destructive`, `success`, `warning`, `info`, `neutral`.
   - Radius 6pt (`radius.sm`), border 1px, padding horizontal 8pt, padding vertikal 3pt.
4. **Input dan Label**
   - `Label`: Teks 14pt, bobot sedang (`500`), warna `#09090B`, margin bawah 6pt.
   - `Input`: Latar `#FFFFFF`, border 1px `#E4E4E7`, radius 8pt, tinggi minimal 44pt, border fokus `#18181B`.
5. **Tabs (Segmented Control)**
   - Terdiri dari container rail `#F4F4F5` dengan padding 4pt dan radius 8pt.
   - Trigger aktif berupa kartu putih `#FFFFFF` dengan border halus `#E4E4E7`, whisper shadow, teks hitam pekat `600`, serta tap target minimal 44pt.
6. **Alert**
   - Kotak notifikasi kontekstual dengan varian `default`, `destructive`, `info`, `warning`.
   - Radius 8pt, border 1px semantik, memuat judul ringkas dan deskripsi jelas.
7. **Avatar**
   - Wadah inisial nama peserta didik atau pengguna (1 sampai 2 karakter kapital).
   - Ukuran `sm` (32pt), `md` (40pt), `lg` (48pt). Latar `#F4F4F5`, border `#E4E4E7`, teks `#18181B`.
8. **Separator**
   - Garis pembatas tipis 1px `#E4E4E7` untuk memisahkan item daftar dalam kartu tanpa membuat kartu baru bertumpuk.
9. **Sheet (ModalSheet)**
   - Bottom sheet interaktif dengan backdrop gelap lembut `rgba(9, 9, 11, 0.45)`.
   - Wadah putih `#FFFFFF` dengan radius atas 16pt, handle pill abu-abu `#D4D4D8`, pemisah header, dan tombol tutup 44pt x 44pt.
10. **Skeleton**
    - Penampung animasi pemuatan data ringan dengan warna latar `#E4E4E7` dan radius yang dapat disesuaikan.
11. **ChildSwitcher**
    - Komponen pemilihan anak asuh yang ringkas. Jika hanya 1 anak, menampilkan identitas anak dalam satu kartu hairline rapi. Jika lebih dari 1 anak, menampilkan daftar avatar dan nama yang mudah disentuh.
12. **StateView**
    - Tampilan status kosong (empty state), pemuatan (loading state), atau kegagalan koneksi (error state) dengan ikon monokrom yang tenang dan tombol tindak lanjut.

---

## 5. Aturan Anti-Clutter Mobile (Layar 360px)

1. **Larangan Kartu di Dalam Kartu (No Card Nesting)**
   Tidak boleh meletakkan komponen `Card` di dalam `Card` lainnya. Jika menyajikan daftar item (misalnya riwayat transaksi atau daftar absensi), gunakan satu `Card` pembungkus dan pisahkan item menggunakan komponen `Separator`.
2. **Batas Navigasi Bawah (Bottom Bar)**
   Bilah navigasi bawah maksimal memuat 5 tab utama dengan latar putih bersih, hairline border atas 1px `#E4E4E7`, dan label teks yang ringkas.
3. **Konvensi Bahasa Indonesia Alami**
   - Salam personal yang sopan: *"Selamat pagi, Ibu Siti"* bukan *"Halo Pengguna"*.
   - Aksi yang spesifik: *"Ajukan Izin"*, *"Unduh Rapor"*, *"Kirim Bukti Bayar"*.
   - Pesan galat yang solutif: *"Koneksi terputus. Silakan ketuk Coba Lagi untuk memuat data."*
   - Format mata uang baku: `Rp 250.000` dengan font angka tabular.
   - Format tanggal baku Indonesia: `Senin, 24 November 2026`.
