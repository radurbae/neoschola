import type { Database } from "bun:sqlite";
import { ensureSchema } from "./schema";
import { hashPassword } from "../lib/auth";
import { createDatabase } from "./client";

export async function seedDatabase(
  db: Database,
  options: { force?: boolean } = {}
): Promise<void> {
  ensureSchema(db);

  const existingCount = db
    .query("SELECT COUNT(*) as count FROM users")
    .get() as { count: number };

  if (existingCount.count > 0 && !options.force) {
    return;
  }

  if (options.force) {
    db.exec(`
      DELETE FROM notifications;
      DELETE FROM invoices;
      DELETE FROM messages;
      DELETE FROM message_threads;
      DELETE FROM announcement_reads;
      DELETE FROM announcements;
      DELETE FROM grade_notes;
      DELETE FROM assignments;
      DELETE FROM schedules;
      DELETE FROM leave_requests;
      DELETE FROM attendances;
      DELETE FROM guardian_students;
      DELETE FROM students;
      DELETE FROM classes;
      DELETE FROM users;
    `);
  }

  // 1. Password default untuk semua akun demo: "neoschola123"
  const defaultAuth = await hashPassword("neoschola123");

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, name, role, phone, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  insertUser.run(
    "usr_budi",
    "wali.budi@neoschola.demo",
    defaultAuth.hash,
    defaultAuth.salt,
    "Budi Santoso",
    "GUARDIAN",
    "081234567890",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Budi"
  );

  insertUser.run(
    "usr_siti",
    "wali.siti@neoschola.demo",
    defaultAuth.hash,
    defaultAuth.salt,
    "Siti Rahmawati",
    "GUARDIAN",
    "081398765432",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Siti"
  );

  insertUser.run(
    "usr_ani",
    "guru.ani@neoschola.demo",
    defaultAuth.hash,
    defaultAuth.salt,
    "Ani Wijayanti, S.Pd.",
    "TEACHER",
    "082155667788",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Ani"
  );

  insertUser.run(
    "usr_admin",
    "admin.tu@neoschola.demo",
    defaultAuth.hash,
    defaultAuth.salt,
    "Hendra Setiawan",
    "ADMIN",
    "085611223344",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Hendra"
  );

  // 2. Classes
  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade_level, academic_year, homeroom_teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  insertClass.run("cls_4a", "Kelas 4A", 4, "2026/2027", "usr_ani");
  insertClass.run("cls_2b", "Kelas 2B", 2, "2026/2027", null);

  // 3. Students
  const insertStudent = db.prepare(`
    INSERT INTO students (id, nis, nisn, full_name, nickname, class_id, gender, birth_date, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  insertStudent.run(
    "std_raka",
    "202404001",
    "0123456789",
    "Raka Pratama",
    "Raka",
    "cls_4a",
    "L",
    "2016-04-12"
  );

  insertStudent.run(
    "std_nadia",
    "202402015",
    "0123456790",
    "Nadia Putri",
    "Nadia",
    "cls_2b",
    "P",
    "2018-08-20"
  );

  insertStudent.run(
    "std_dimas",
    "202404002",
    "0123456791",
    "Dimas Mahendra",
    "Dimas",
    "cls_4a",
    "L",
    "2016-06-15"
  );

  // 4. Guardian Students Relations
  const insertGuardianStudent = db.prepare(`
    INSERT INTO guardian_students (id, guardian_id, student_id, relationship, is_primary, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  insertGuardianStudent.run("gs_budi_raka", "usr_budi", "std_raka", "AYAH", 1);
  insertGuardianStudent.run("gs_budi_nadia", "usr_budi", "std_nadia", "AYAH", 1);
  insertGuardianStudent.run("gs_siti_dimas", "usr_siti", "std_dimas", "IBU", 1);

  // 5. Attendances (2 minggu terakhir)
  const insertAttendance = db.prepare(`
    INSERT INTO attendances (id, student_id, class_id, date, status, check_in_time, check_out_time, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Buat 10 hari sekolah terakhir (weekday)
  const dates: string[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      // Senin - Jumat
      dates.push(d.toISOString().split("T")[0]);
    }
  }

  for (let idx = 0; idx < dates.length; idx++) {
    const date = dates[idx];
    const isLatest = idx === dates.length - 1;

    // Raka Pratama (Hadir kebanyakan, 1 hari sakit)
    if (idx === 3) {
      insertAttendance.run(
        `att_raka_${idx}`,
        "std_raka",
        "cls_4a",
        date,
        "SAKIT",
        null,
        null,
        "Surat dokter demam",
        "usr_ani"
      );
    } else {
      insertAttendance.run(
        `att_raka_${idx}`,
        "std_raka",
        "cls_4a",
        date,
        "HADIR",
        "06:48",
        isLatest ? null : "13:30",
        null,
        "usr_ani"
      );
    }

    // Dimas Mahendra (Hadir kebanyakan, 1 hari izin)
    if (idx === 6) {
      insertAttendance.run(
        `att_dimas_${idx}`,
        "std_dimas",
        "cls_4a",
        date,
        "IZIN",
        null,
        null,
        "Acara keluarga luar kota",
        "usr_ani"
      );
    } else {
      insertAttendance.run(
        `att_dimas_${idx}`,
        "std_dimas",
        "cls_4a",
        date,
        "HADIR",
        "06:55",
        isLatest ? null : "13:30",
        null,
        "usr_ani"
      );
    }

    // Nadia Putri (Hadir tertib)
    insertAttendance.run(
      `att_nadia_${idx}`,
      "std_nadia",
      "cls_2b",
      date,
      "HADIR",
      "06:42",
      isLatest ? null : "12:15",
      null,
      "usr_admin"
    );
  }

  // 6. Leave Requests
  const insertLeave = db.prepare(`
    INSERT INTO leave_requests (id, student_id, guardian_id, leave_type, start_date, end_date, reason, attachment_url, status, reviewed_by, reviewed_at, review_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertLeave.run(
    "lvr_1",
    "std_raka",
    "usr_budi",
    "SAKIT",
    "2026-11-18",
    "2026-11-19",
    "Demam dan batuk pilek, istirahat dokter",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400",
    "APPROVED",
    "usr_ani",
    "2026-11-18 07:15:00",
    "Semoga lekas pulih Raka, jangan lupa minum obat."
  );

  insertLeave.run(
    "lvr_2",
    "std_dimas",
    "usr_siti",
    "IZIN",
    "2026-11-26",
    "2026-11-27",
    "Menghadiri resepsi pernikahan bibi di Solo",
    null,
    "PENDING",
    null,
    null,
    null
  );

  // 7. Schedules
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, class_id, day_of_week, start_time, end_time, subject, teacher_name, room, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const schedules4A = [
    { day: "SENIN", start: "07:00", end: "07:45", subject: "Upacara Bendera", teacher: "Guru Piket", room: "Lapangan" },
    { day: "SENIN", start: "07:45", end: "09:15", subject: "Pendidikan Agama & Budi Pekerti", teacher: "Ahmad Fauzi, S.Pd.I", room: "Ruang 4A" },
    { day: "SENIN", start: "09:45", end: "11:15", subject: "Bahasa Indonesia", teacher: "Ani Wijayanti, S.Pd.", room: "Ruang 4A" },
    { day: "SELASA", start: "07:15", end: "08:45", subject: "Matematika", teacher: "Ani Wijayanti, S.Pd.", room: "Ruang 4A" },
    { day: "SELASA", start: "09:15", end: "10:45", subject: "IPAS (Sains & Sosial)", teacher: "Ani Wijayanti, S.Pd.", room: "Ruang 4A" },
    { day: "RABU", start: "07:15", end: "09:15", subject: "PJOK (Olahraga)", teacher: "Bambang Sudarsono, S.Pd.", room: "Lapangan" },
    { day: "RABU", start: "09:45", end: "11:15", subject: "Pendidikan Pancasila", teacher: "Ani Wijayanti, S.Pd.", room: "Ruang 4A" },
    { day: "KAMIS", start: "07:15", end: "08:45", subject: "Bahasa Inggris", teacher: "Dewi Lestari, S.Pd.", room: "Lab Bahasa" },
    { day: "KAMIS", start: "09:15", end: "10:45", subject: "Seni Musik & Tari (SBdP)", teacher: "Ratna Sari, S.Sn.", room: "Ruang Kesenian" },
    { day: "JUMAT", start: "07:00", end: "07:45", subject: "Senam Pagi & Literasi", teacher: "Ani Wijayanti, S.Pd.", room: "Halaman Depan" },
    { day: "JUMAT", start: "08:00", end: "09:30", subject: "Bahasa Jawa / Muatan Lokal", teacher: "Suryono, S.Pd.", room: "Ruang 4A" },
  ];

  for (let i = 0; i < schedules4A.length; i++) {
    const s = schedules4A[i];
    insertSchedule.run(`sch_4a_${i + 1}`, "cls_4a", s.day, s.start, s.end, s.subject, s.teacher, s.room);
  }

  const schedules2B = [
    { day: "SENIN", start: "07:00", end: "07:45", subject: "Upacara Bendera", teacher: "Guru Piket", room: "Lapangan" },
    { day: "SENIN", start: "07:45", end: "09:15", subject: "Bahasa Indonesia", teacher: "Kartini, S.Pd.", room: "Ruang 2B" },
    { day: "SELASA", start: "07:15", end: "08:45", subject: "Matematika Dasar", teacher: "Kartini, S.Pd.", room: "Ruang 2B" },
    { day: "RABU", start: "07:15", end: "08:45", subject: "Seni Rupa & Prakarya", teacher: "Kartini, S.Pd.", room: "Ruang 2B" },
    { day: "KAMIS", start: "07:15", end: "08:45", subject: "Pendidikan Pancasila", teacher: "Kartini, S.Pd.", room: "Ruang 2B" },
    { day: "JUMAT", start: "07:00", end: "08:30", subject: "Senam Sehat & Karakter", teacher: "Kartini, S.Pd.", room: "Lapangan" },
  ];

  for (let i = 0; i < schedules2B.length; i++) {
    const s = schedules2B[i];
    insertSchedule.run(`sch_2b_${i + 1}`, "cls_2b", s.day, s.start, s.end, s.subject, s.teacher, s.room);
  }

  // 8. Assignments
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, class_id, title, description, subject, due_date, assigned_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertAssignment.run(
    "asg_1",
    "cls_4a",
    "Latihan Soal Pecahan Senilai",
    "Kerjakan soal latihan halaman 45 buku paket Matematika no 1 sampai 10 di buku tulis halus.",
    "Matematika",
    "2026-11-27",
    "usr_ani"
  );

  insertAssignment.run(
    "asg_2",
    "cls_4a",
    "Menulis Ringkasan Cerita Rakyat Nusantara",
    "Pilih satu cerita rakyat daerah asal keluarga Anda, tulis ringkasan 2 paragraf dan sebutkan amanat ceritanya.",
    "Bahasa Indonesia",
    "2026-11-30",
    "usr_ani"
  );

  insertAssignment.run(
    "asg_3",
    "cls_2b",
    "Menggambar Pola Geometri Berwarna",
    "Gambar 5 bentuk bangun datar dan warnai dengan krayon sesuai kreativitas.",
    "Seni Rupa",
    "2026-11-28",
    "usr_admin"
  );

  // 9. Grade Notes
  const insertGrade = db.prepare(`
    INSERT INTO grade_notes (id, student_id, subject, semester, academic_year, score, notes, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertGrade.run("grd_1", "std_raka", "Matematika", 1, "2026/2027", 88, "Pemahaman konsep pecahan dan perkalian sangat matang.", "usr_ani");
  insertGrade.run("grd_2", "std_raka", "Bahasa Indonesia", 1, "2026/2027", 92, "Kosa kata kaya dan tata bahasa rapi saat presentasi.", "usr_ani");
  insertGrade.run("grd_3", "std_raka", "IPAS", 1, "2026/2027", 85, "Eksperimen sains siklus air dilakukan dengan teliti.", "usr_ani");

  insertGrade.run("grd_4", "std_dimas", "Matematika", 1, "2026/2027", 78, "Sudah bagus, tingkatkan ketelitian dalam operasi pembagian.", "usr_ani");
  insertGrade.run("grd_5", "std_dimas", "Bahasa Indonesia", 1, "2026/2027", 84, "Gemar membaca dan aktif bertanya di kelas.", "usr_ani");

  insertGrade.run("grd_6", "std_nadia", "Bahasa Indonesia", 1, "2026/2027", 90, "Membaca nyaring sangat lancar dan artikulasi jelas.", "usr_ani");
  insertGrade.run("grd_7", "std_nadia", "Seni Rupa", 1, "2026/2027", 95, "Sangat kreatif dalam eksplorasi warna pastel.", "usr_ani");

  // 10. Announcements
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (id, title, content, category, target_role, class_id, is_pinned, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertAnnouncement.run(
    "anc_1",
    "Pemberitahuan Cuaca Ekstrem & Penjemputan Lebih Awal",
    "Berdasarkan rilis BMKG dan arahan Dinas Pendidikan terkait hujan deras disertai angin kencang, kegiatan belajar mengajar hari ini berakhir pukul 11.30 WIB. Mohon Bapak/Ibu wali murid menjemput putra-putri tepat waktu dengan mengutamakan keselamatan berkendara.",
    "DARURAT",
    "ALL",
    null,
    1,
    "usr_admin"
  );

  insertAnnouncement.run(
    "anc_2",
    "Peringatan Hari Guru Nasional & Dresscode Seragam Batik",
    "Dalam rangka memperingati Hari Guru Nasional, pada hari Senin seluruh peserta didik dihimbau mengenakan seragam batik bebas rapi dan sepatu hitam bertali.",
    "SEKOLAH",
    "ALL",
    null,
    0,
    "usr_admin"
  );

  insertAnnouncement.run(
    "anc_3",
    "Persiapan Belajar Kelompok Tematik Kelas 4A",
    "Bapak/Ibu wali murid kelas 4A, mohon mendampingi ananda menyiapkan gunting aman, lem kertas, dan majalah bekas untuk materi daur ulang hari Kamis esok.",
    "KELAS",
    "GUARDIAN",
    "cls_4a",
    0,
    "usr_ani"
  );

  insertAnnouncement.run(
    "anc_4",
    "Kunjungan Edukatif Museum Nasional & Kebun Raya",
    "Pendaftaran kegiatan field trip semester ganjil telah dibuka. Formulir persetujuan dapat diambil melalui wali kelas masing-masing hingga akhir pekan ini.",
    "KEGIATAN",
    "GUARDIAN",
    null,
    0,
    "usr_admin"
  );

  // 11. Announcement Reads
  const insertRead = db.prepare(`
    INSERT INTO announcement_reads (id, announcement_id, user_id, read_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  insertRead.run("ar_budi_1", "anc_1", "usr_budi");
  insertRead.run("ar_siti_1", "anc_1", "usr_siti");

  // 12. Message Threads
  const insertThread = db.prepare(`
    INSERT INTO message_threads (id, student_id, guardian_id, teacher_id, subject, last_message_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  insertThread.run("th_1", "std_raka", "usr_budi", "usr_ani", "Perkembangan Belajar & Minat Sains Raka");
  insertThread.run("th_2", "std_dimas", "usr_siti", "usr_ani", "Konsultasi Izin Kegiatan Keluarga Dimas");

  // 13. Messages
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, thread_id, sender_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  insertMessage.run(
    "msg_1_1",
    "th_1",
    "usr_budi",
    "Selamat pagi Bu Ani, terima kasih atas bimbingannya. Raka bercerita sangat antusias dengan proyek siklus air kemarin.",
    1
  );
  insertMessage.run(
    "msg_1_2",
    "th_1",
    "usr_ani",
    "Selamat pagi Pak Budi. Sama-sama Pak, Raka memang punya daya analisis yang sangat kuat dan suka berbagi dengan teman kelompoknya.",
    1
  );

  insertMessage.run(
    "msg_2_1",
    "th_2",
    "usr_siti",
    "Assalamualaikum Bu Ani, saya sudah mengajukan izin untuk Dimas via aplikasi untuk tanggal 26-27 ya Bu.",
    1
  );
  insertMessage.run(
    "msg_2_2",
    "th_2",
    "usr_ani",
    "Waalaikumsalam Bu Siti, baik sudah kami terima dan akan segera diverifikasi. Semoga perjalanannya lancar.",
    0
  );

  // 14. Invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, student_id, title, description, amount, due_date, status, payment_method, payment_ref, proof_note, payment_proof_url, receipt_no, paid_at, verified_by, verified_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertInvoice.run(
    "inv_1",
    "std_raka",
    "Iuran SPP & Sarana Belajar Bulan November 2026",
    "SPP rutin bulanan mencakup ekstrakurikuler dan operasional kelas",
    250000,
    "2026-11-30",
    "UNPAID",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  );

  insertInvoice.run(
    "inv_2",
    "std_dimas",
    "Iuran SPP & Sarana Belajar Bulan November 2026",
    "SPP rutin bulanan mencakup ekstrakurikuler dan operasional kelas",
    250000,
    "2026-11-30",
    "WAITING_VERIFICATION",
    "VIRTUAL_ACCOUNT",
    "VA-881020261120",
    "Pembayaran via m-Banking Mandiri",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
    null,
    "2026-11-20 14:22:00",
    null,
    null
  );

  insertInvoice.run(
    "inv_3",
    "std_nadia",
    "Iuran SPP & Sarana Belajar Bulan November 2026",
    "SPP rutin bulanan mencakup ekstrakurikuler dan operasional kelas",
    250000,
    "2026-11-30",
    "PAID",
    "TRANSFER_BANK",
    "TRF-20261115-003",
    "Transfer BCA a.n. Budi Santoso",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
    "KW-202611-0001",
    "2026-11-15 09:30:00",
    "usr_admin",
    "2026-11-15 10:00:00"
  );

  insertInvoice.run(
    "inv_4",
    "std_raka",
    "Modul Belajar & Buku Tematik Semester Ganjil",
    "Paket buku kurikulum merdeka dan modul pendamping",
    150000,
    "2026-10-15",
    "OVERDUE",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
  );

  // 15. Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, type, reference_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertNotification.run(
    "ntf_1",
    "usr_budi",
    "Presensi Masuk Tercatat",
    "Raka Pratama telah hadir di sekolah pukul 06:48 WIB.",
    "PRESENSI",
    "std_raka",
    1
  );

  insertNotification.run(
    "ntf_2",
    "usr_budi",
    "Pemberitahuan Cuaca Ekstrem",
    "Penjemputan ananda lebih awal pada pukul 11.30 WIB demi keamanan.",
    "PENGUMUMAN",
    "anc_1",
    0
  );

  insertNotification.run(
    "ntf_3",
    "usr_budi",
    "Tagihan SPP November 2026",
    "Tagihan SPP Raka Pratama sebesar Rp 250.000 telah terbit.",
    "TAGIHAN",
    "inv_1",
    0
  );

  insertNotification.run(
    "ntf_4",
    "usr_siti",
    "Status Pengajuan Izin",
    "Pengajuan izin Dimas Mahendra tanggal 26-27 November sedang ditinjau wali kelas.",
    "IZIN",
    "lvr_2",
    0
  );

  insertNotification.run(
    "ntf_5",
    "usr_ani",
    "Pengajuan Izin Siswa Baru",
    "Ibu Siti Rahmawati mengajukan izin untuk Dimas Mahendra (Kelas 4A).",
    "IZIN",
    "lvr_2",
    0
  );
}

// CLI runner jika dipanggil langsung: `bun apps/api/src/db/seed.ts`
if (import.meta.main) {
  const db = createDatabase();
  console.log("Menjalankan seed database NeoSchola...");
  await seedDatabase(db, { force: true });
  console.log("Seed database berhasil diselesaikan dengan 100% data sintetis.");
}
