# NeoSchola: Panduan Desain & Sistem Token UI/UX

Panduan desain visual, interaksi, dan sistem token untuk aplikasi mobile dan web NeoSchola berbasis **NeoSchola Pastel Bento + Obsidian Frame** dengan mempertahankan disiplin komponen **ui.shadcn.com (Zinc Base / New York Style)**.

## 1. Prinsip Desain

1. **NeoSchola Pastel Bento + Obsidian Frame**
   Antarmuka memadukan bingkai Obsidian gelap yang kokoh dan berwibawa dengan kartu pastel lembut tanpa garis batas (borderless) di atas kanvas putih murni. Pendekatan ini menghadirkan pengalaman visual yang hangat, modern, elegan, dan menyenangkan bagi orang tua murid serta staf sekolah.
2. **Shell Responsif Adaptif (Breakpoint 768px)**
   - Layar Lebar / Tablet (lebar >= 768px): Dark Obsidian Left Rail (#141416) dengan lebar 64 sampai 72px yang memuat logo badge krem (#FAF3DF), daftar ikon navigasi vertikal di tengah, dan tombol keluar di bagian bawah, dipadukan dengan area kanvas putih (#FFFFFF) ber-radius 24pt.
   - Layar Ponsel (lebar < 768px): Kanvas putih (#FFFFFF) penuh dengan Floating Dark Bottom Dock (#141416) melayang setinggi 60pt ber-radius 24pt yang memuat hingga 5 ikon navigasi utama dan indikator aktif Ice Blue.
3. **Kartu Bento Pastel Tanpa Garis Batas (Borderless Bento)**
   Menghindari garis batas yang kaku dan bayangan berat yang kotor. Kartu informasi menggunakan warna pastel lembut dengan radius 20 sampai 24pt (radius.xl dan radius.xxl) yang tersusun rapi dalam grid bento modular.
4. **Ruang Napas Lega dan Tata Letak Terstruktur**
   Setiap modul informasi memiliki jarak yang terukur sehingga informasi utama (seperti kehadiran, jadwal, pengumuman, dan tagihan) dapat dipindai secara intuitif tanpa menimbulkan kelelahan mata.
5. **Aksesibilitas dan Keterbacaan Utama**
   - Semua target sentuh (tap target) memiliki ukuran minimal 44pt x 44pt (minHeight: 44).
   - Seluruh pasangan warna teks dan latar belakang lulus uji rasio kontras WCAG 2.1 AA (minimal 4.5:1).
   - Angka keuangan, jam, dan persentase selalu menggunakan font angka bertabuler (tabular-nums).
6. **Bahasa Indonesia Alami dan Ramah**
   Seluruh salinan antarmuka menggunakan Bahasa Indonesia baku yang santun, hangat, komunikatif, dan bebas dari istilah teknis yang membingungkan.

---

## 2. Token Warna & Palet Pastel Bento

### A. Palet Obsidian Frame & Surface

| Token | Nilai Hex | Fungsi / Penggunaan | Rasio Kontras |
|---|---|---|---|
| `obsidian` | `#141416` | Bingkai rail navigasi samping dan floating bottom dock | Dasar Gelap |
| `obsidianHover` | `#27272A` | Highlight status aktif atau ditekan pada bilah navigasi gelap | Nyaman |
| `obsidianBorder` | `#2E2E32` | Garis aksen geometris pada kartu aksi gelap | Aksen Halus |
| `obsidianMuted` | `#A1A1AA` | Ikon tidak aktif dan teks keterangan di atas bingkai obsidian | 7.2:1 terhadap `#141416` |
| `obsidianForeground` | `#FAFAFA` | Teks utama, judul, dan ikon aktif di atas bingkai obsidian | 17.6:1 terhadap `#141416` |
| `creamBadge` | `#FAF3DF` | Latar badge logo inisial sekolah pada rail samping | Kontras Tinggi |
| `surface` | `#FFFFFF` | Kanvas utama layar dan wadah konten aplikasi | Dasar Putih |
| `pillSurface` | `#F4F4F5` | Latar tombol bundar utilitas, switcher, dan badge netral | Netral Lembut |

### B. Palet Kartu Pastel Bento (Borderless, Radius 20-24pt)

| Token | Nilai Hex | Fungsi / Penggunaan | Rasio Kontras |
|---|---|---|---|
| `iceBlue` | `#EAF3FE` | Latar kartu ringkasan kehadiran dan kartu grafik tren | Pastel Sejuk |
| `iceBlueText` | `#1D4ED8` | Teks aksen dan persentase tren pada kartu Ice Blue | 6.3:1 terhadap `#EAF3FE` |
| `iceBlueCta` | `#D6E8FF` | Latar tombol aksi pill pada kartu obsidian | 15.8:1 dengan teks `#09090B` |
| `iceBlueBar` | `#BFDBFE` | Batang grafik data pada sparkline MiniTrendChart | Terlihat Jernih |
| `iceBlueActive` | `#2563EB` | Batang data aktif dan titik fokus tren terakhir | Kontras Tegas |
| `lavender` | `#EDE7FA` | Latar kartu modul akademik, tugas, dan nilai | Pastel Lembut |
| `lavenderText` | `#5B21B6` | Teks keterangan dan sorotan tren pada kartu Lavender | 8.5:1 terhadap `#EDE7FA` |
| `mint` | `#E2F5E9` | Latar kartu status kehadiran prima dan pembayaran lunas | Pastel Segar |
| `mintText` | `#15803D` | Teks status sukses dan persentase kehadiran tepat waktu | 4.6:1 terhadap `#E2F5E9` |
| `butter` | `#FCF4DC` | Latar kartu pengingat tagihan dan perizinan pending | Pastel Hangat |
| `butterText` | `#92400E` | Teks peringatan dan catatan penting pada kartu Butter | 6.6:1 terhadap `#FCF4DC` |
| `pastelMutedText` | `#3F3F46` | Teks label keterangan umum di atas semua kartu pastel | >= 8.5:1 di seluruh pastel |

### C. Token Semantik shadcn/ui (Zinc Base)

| Token | Nilai Hex | Fungsi / Penggunaan | Rasio Kontras |
|---|---|---|---|
| `background` | `#FFFFFF` | Latar belakang dasar permukaan kartu dan modal | Dasar |
| `canvas` | `#FFFFFF` | Latar kanvas layar aplikasi (diselaraskan ke putih murni) | Dasar |
| `foreground` | `#09090B` | Teks utama, judul, dan angka hero (Zinc-950) | 19.8:1 terhadap `#FFFFFF` |
| `card` | `#FFFFFF` | Permukaan kartu standar | Kontras Tinggi |
| `cardForeground` | `#09090B` | Teks utama kartu | 19.8:1 terhadap `#FFFFFF` |
| `primary` | `#18181B` | Tombol utama, tab aktif, seleksi penting (Zinc-900) | 17.7:1 terhadap `#FFFFFF` |
| `primaryPressed` | `#27272A` | Tombol utama saat ditekan (Zinc-800) | 15.3:1 terhadap `#FFFFFF` |
| `primaryForeground` | `#FAFAFA` | Teks di atas tombol utama (Zinc-50) | 17.1:1 terhadap `#18181B` |
| `secondary` | `#F4F4F5` | Tombol alternatif dan latar chip (Zinc-100) | Netral |
| `secondaryPressed` | `#E4E4E7` | Tombol sekunder saat ditekan (Zinc-200) | Terlihat Nyata |
| `secondaryForeground` | `#18181B` | Teks di atas tombol sekunder | 15.8:1 terhadap `#F4F4F5` |
| `muted` | `#F4F4F5` | Latar elemen nonaktif atau selingan | Netral |
| `mutedForeground` | `#52525B` | Teks pendukung, timestamp, placeholder (Zinc-600) | 7.1:1 terhadap `#FFFFFF` |
| `destructive` | `#DC2626` | Tombol hapus dan penanda bahaya fatal (Red-600) | 4.6:1 terhadap `#FFFFFF` |
| `destructiveForeground` | `#FAFAFA` | Teks di atas tombol bahaya | 4.5:1 terhadap `#DC2626` |
| `border` | `#E4E4E7` | Garis batas komponen hairline dan pemisah | Presisi 1px |
| `input` | `#E4E4E7` | Garis batas input formulir | Presisi 1px |
| `ring` | `#18181B` | Indikator fokus interaksi formulir | Jelas |

---

## 3. Geometri, Elevasi, dan Tipografi

### Radius Sudut (Border Radius)
Sistem radius diperluas untuk mendukung estetika Bento modern:
- `sm: 6pt`: Lencana status (Badge), tag kecil, trigger tabs.
- `md: 8pt`: Kolom input formulir, container tabs, kotak peringatan (Alert).
- `lg: 12pt`: Kartu konten hairline standar, wadah grup item, logo badge samping.
- `xl: 20pt`: Kartu statistik pastel (PastelStatCard) borderless.
- `xxl: 24pt`: Modul bento besar (MiniTrendChart, DarkActionCard), kanvas tablet, dan dock bawah.
- `full: 9999pt`: Tombol pill CTA, avatar, tombol lingkaran utilitas, titik status.

### Elevasi Halus (Whisper Shadow)
- **None**: Tanpa bayangan untuk kartu pastel borderless dan bingkai obsidian datar.
- **XS (Whisper Shadow)**:
  - iOS: `shadowColor: "#09090B"`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.04`, `shadowRadius: 2`
  - Android: `elevation: 1`
  - Web: `boxShadow: "0 1px 2px rgba(9, 9, 11, 0.04)"`
- **SM (Card & Sheet Shadow)**:
  - iOS: `shadowColor: "#09090B"`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.06`, `shadowRadius: 3`
  - Android: `elevation: 2`
  - Web: `boxShadow: "0 1px 3px rgba(9, 9, 11, 0.06)"`

### Tipografi Sistem Native
- **Heading**: Bobot `bold` (700) atau `semibold` (600) dengan letter spacing negatif:
  - Nilai hero statistik bento: `fontSize: 28pt`, `fontWeight: "700"`, `fontVariant: ["tabular-nums"]`.
  - Judul layar utilitas atas: `fontSize: 24pt`, `fontWeight: "700"`, `letterSpacing: -0.5`.
  - Judul kartu aksi: `fontSize: 20pt`, `fontWeight: "700"`, `letterSpacing: -0.3`.
  - Nilai kartu statistik: `fontSize: 18pt`, `fontWeight: "700"`, `fontVariant: ["tabular-nums"]`.
  - Judul seksi dan kartu standar: `fontSize: 16pt` atau `18pt`, `letterSpacing: -0.2`.
- **Angka Finansial, Skor, dan Jam**: Wajib menyertakan `fontVariant: ["tabular-nums"]` agar seluruh digit angka sejajar vertikal saat dibandingkan.

---

## 4. Katalog Komponen Bento Baru

1. **ResponsiveShell**
   - Rangka aplikasi adaptif yang berpindah mulus berdasarkan lebar layar (`useWindowDimensions()`).
   - Mode Tablet (lebar >= 768px): Dark Obsidian Left Rail (#141416) selebar 64px dengan logo badge krem "NS" di atas, deretan ikon navigasi vertikal di tengah dengan pill sorotan saat aktif, serta tombol keluar akun di bagian bawah. Di sampingnya terdapat kanvas konten putih (#FFFFFF) dengan sudut melengkung 24pt.
   - Mode Ponsel (lebar < 768px): Kanvas konten putih penuh (#FFFFFF) dengan Floating Dark Bottom Dock (#141416) setinggi 60pt ber-radius 24pt di bagian bawah layar yang menampilkan hingga 5 ikon navigasi dan indikator titik aktif Ice Blue.
2. **TopUtilityBar**
   - Bilah utilitas atas layar yang bersih dan ringkas.
   - Sisi kiri: Judul tebal 24pt dengan letter-spacing -0.5, subjudul opsional, serta slot aksi kiri (misalnya tombol kembali).
   - Sisi kanan: Tombol bundar 44x44pt warna Pill Surface untuk notifikasi (dilengkapi dot merah penanda pesan baru) dan pengumuman, serta Profile Pill dengan avatar ringkas dan nama depan pengguna.
3. **PastelStatCard**
   - Kartu metrik bento borderless dengan radius 20pt dan padding 16pt.
   - Pilihan nuansa pastel: `iceBlue`, `lavender`, `mint`, dan `butter`.
   - Menampilkan angka nilai besar 18pt tebal tabular, label keterangan abu-abu gelap (#3F3F46), kotak ikon putih 36x36pt di sudut kiri bawah, serta persentase atau teks tren dengan warna kontras AA di sisi kanan.
4. **MiniTrendChart**
   - Kartu tren interaktif bernuansa Soft Ice Blue (#EAF3FE) ber-radius 24pt dengan padding 20pt.
   - Menampilkan angka metrik utama 28pt tebal tabular, keterangan subjudul, serta lencana callout obsidian di sudut kanan atas.
   - Grafik batang sparkline murni dibangun menggunakan React Native View tanpa dependensi pustaka grafik luar, dengan batang warna Ice Blue Bar dan aksen khusus pada batang data terakhir.
   - Baris pengalih periode waktu (Period Switcher) di bagian bawah dengan target sentuh aman minimal 44pt (menggunakan hitSlop).
5. **DarkActionCard**
   - Kartu aksi utama bernuansa Obsidian gelap (#141416) dengan radius 24pt dan padding 20pt.
   - Dihiasi dua garis aksen geometris halus di sudut kanan bawah tanpa menghalangi interaksi sentuh.
   - Memuat tag label opsi di atas judul, judul tebal putih 20pt, paragraf deskripsi yang jelas, serta tombol pill Ice Blue CTA yang mudah ditekan.
6. **DarkIconRow**
   - Baris daftar informasi dan transaksi dengan tinggi minimal 56pt.
   - Bagian kiri memuat kotak ikon gelap 40x40pt ber-radius 12pt dengan ikon putih.
   - Bagian tengah memuat judul dan subjudul yang fleksibel terpotong rapi.
   - Bagian kanan memuat teks angka utama tabular serta label status semantik dengan rasio kontras warna yang aman.

---

## 5. Primitif Komponen shadcn/ui yang Dipertahankan

1. **Button**: Varian `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`. Tap target minimal 44pt.
2. **Card**: Pembungkus kartu berstruktur (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
3. **Badge**: Lencana status semantik (`default`, `secondary`, `outline`, `destructive`, `success`, `warning`, `info`, `neutral`).
4. **Input dan Label**: Formulir dengan border 1px, tap target 44pt, serta indikator fokus yang tegas.
5. **Tabs**: Pengalih segmen dengan rail netral dan trigger kartu aktif berbayang halus.
6. **Alert**: Kotak informasi peringatan dan pengumuman kontekstual.
7. **Avatar**: Inisial pengguna berlatar netral dengan ukuran `sm`, `md`, `lg`.
8. **Separator**: Garis pemisah hairline 1px untuk membatasi item tanpa menambah tumpukan kartu.
9. **Sheet (ModalSheet)**: Lembar dialog interaktif dari bawah dengan latar belakang redup.
10. **Skeleton**: Wadah animasi pemuatan data yang ringan dan halus.
11. **ChildSwitcher**: Pengalih anak asuh yang ramah sentuhan.
12. **StateView**: Tampilan status kosong (empty), sedang memuat (loading), atau gagal koneksi (error).

---

## 6. Aturan Aksesibilitas dan Anti-Clutter

1. **Larangan Penumpukan Kartu (No Card Nesting)**
   Tidak menempatkan kartu di dalam kartu pastel lainnya. Gunakan pembagian grid bento horizontal atau vertikal yang sejajar, atau manfaatkan `Separator` dan `DarkIconRow` untuk daftar item.
2. **Jaminan Target Sentuh Aman (Minimum 44pt)**
   Setiap elemen interaktif (tombol, tab, pemilih periode, deretan navigasi) wajib memiliki dimensi fisik atau area sentuh efektif minimal 44pt x 44pt (menggunakan `minHeight: 44`, `minWidth: 44`, atau `hitSlop`).
3. **Kepatuhan Kontras Warna WCAG 2.1 AA**
   Seluruh teks di atas kanvas putih, kartu pastel, maupun bingkai obsidian gelap wajib memiliki rasio kontras minimal 4.5:1. Tidak ada warna abu-abu pudar yang sulit dibaca.
4. **Bahasa Indonesia Baku dan Natural**
   - Salam personal: "Selamat pagi, Ibu Siti"
   - Tindakan spesifik: "Lihat Rincian", "Ajukan Izin", "Unduh Tagihan", "Konfirmasi Kehadiran"
   - Format mata uang: `Rp 250.000` dengan font angka tabular
   - Format tanggal Indonesia: `Senin, 24 November 2026`
