import { describe, expect, it, beforeAll } from "bun:test";
import { createDatabase } from "../src/db/client";
import { ensureSchema } from "../src/db/schema";
import { seedDatabase } from "../src/db/seed";
import { createApp } from "../src/app";
import { signJwt, verifyPassword } from "../src/lib/auth";
import { createAnnouncementRoutes } from "../src/routes/announcements";
import { createMessageRoutes } from "../src/routes/messages";
import { createInvoiceRoutes } from "../src/routes/invoices";
import { createNotificationRoutes } from "../src/routes/notifications";

describe("Wave 1 Comms & Finance Route Tests", () => {
  let db: ReturnType<typeof createDatabase>;
  let app: ReturnType<typeof createApp>;
  let budiToken: string;
  let sitiToken: string;
  let aniToken: string;
  let adminToken: string;

  beforeAll(async () => {
    db = createDatabase({ inMemory: true });
    ensureSchema(db);
    await seedDatabase(db, { force: true });

    app = createApp(db);

    // Mount Auth Login
    app.post("/api/auth/login", async (c) => {
      const { email, password } = await c.req.json();
      const user = db
        .query("SELECT * FROM users WHERE email = ?")
        .get(email) as any;

      if (
        !user ||
        !(await verifyPassword(password, user.password_hash, user.password_salt))
      ) {
        return c.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Email atau kata sandi tidak cocok.",
            },
          },
          401
        );
      }

      const token = await signJwt({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      const { password_hash, password_salt, ...safeUser } = user;
      return c.json({ token, user: safeUser });
    });

    // Mount Wave 1 Routes
    app.route("/api/announcements", createAnnouncementRoutes(db));
    app.route("/api/threads", createMessageRoutes(db));
    app.route("/api/invoices", createInvoiceRoutes(db));
    app.route("/api/notifications", createNotificationRoutes(db));

    // Siapkan token autentikasi untuk berbagai peran
    budiToken = await signJwt({
      sub: "usr_budi",
      email: "wali.budi@neoschola.demo",
      role: "GUARDIAN",
    });

    sitiToken = await signJwt({
      sub: "usr_siti",
      email: "wali.siti@neoschola.demo",
      role: "GUARDIAN",
    });

    aniToken = await signJwt({
      sub: "usr_ani",
      email: "guru.ani@neoschola.demo",
      role: "TEACHER",
    });

    adminToken = await signJwt({
      sub: "usr_admin",
      email: "admin.tu@neoschola.demo",
      role: "ADMIN",
    });
  });

  // ==========================================
  // 1. ANNOUNCEMENTS (/api/announcements)
  // ==========================================
  describe("1. Announcements API", () => {
    it("GET /api/announcements oleh GUARDIAN (Budi) hanya menampilkan pengumuman relevan dengan is_read & is_pinned", async () => {
      const res = await app.request("/api/announcements", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.announcements)).toBe(true);

      // anc_1 (DARURAT ALL, is_pinned=true, sudah dibaca Budi di seed)
      const anc1 = data.announcements.find((a: any) => a.id === "anc_1");
      expect(anc1).toBeDefined();
      expect(anc1.is_pinned).toBe(true);
      expect(anc1.is_read).toBe(true);

      // anc_2 (SEKOLAH ALL, belum dibaca Budi)
      const anc2 = data.announcements.find((a: any) => a.id === "anc_2");
      expect(anc2).toBeDefined();
      expect(anc2.is_pinned).toBe(false);
      expect(anc2.is_read).toBe(false);

      // anc_3 (KELAS 4A, Budi punya anak di 4A yaitu Raka)
      const anc3 = data.announcements.find((a: any) => a.id === "anc_3");
      expect(anc3).toBeDefined();
      expect(anc3.class_name).toBe("Kelas 4A");
    });

    it("GET /api/announcements oleh TEACHER (Ani) dan filter kelas", async () => {
      const res = await app.request("/api/announcements?class_id=cls_4a", {
        headers: { Authorization: `Bearer ${aniToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.announcements.every((a: any) => a.class_id === "cls_4a")).toBe(
        true
      );
    });

    it("POST /api/announcements oleh Guru di kelas binaan berhasil dan memicu notifikasi", async () => {
      const res = await app.request("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aniToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Bawalah Pensil Warna 24 Warna",
          content: "Untuk kegiatan seni budaya hari Jumat, seluruh siswa membawa pensil warna.",
          category: "KELAS",
          target_role: "GUARDIAN",
          class_id: "cls_4a",
          is_pinned: false,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.announcement).toBeDefined();
      expect(data.announcement.title).toBe("Bawalah Pensil Warna 24 Warna");
      expect(data.announcement.created_by).toBe("usr_ani");

      // Cek notifikasi masuk ke wali kelas 4A (Budi dan Siti)
      const notifBudi = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_budi' AND reference_id = ?"
        )
        .get(data.announcement.id);
      expect(notifBudi).toBeDefined();

      const notifSiti = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_siti' AND reference_id = ?"
        )
        .get(data.announcement.id);
      expect(notifSiti).toBeDefined();
    });

    it("POST /api/announcements NEGATIF: Guru dilarang membuat pengumuman di kelas lain (403)", async () => {
      const res = await app.request("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aniToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Pengumuman Kelas Lain",
          content: "Percobaan akses kelas yang bukan binaan.",
          category: "KELAS",
          target_role: "GUARDIAN",
          class_id: "cls_2b",
          is_pinned: false,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("POST /api/announcements NEGATIF: Guru dilarang membuat pengumuman DARURAT global (403)", async () => {
      const res = await app.request("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aniToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Pengumuman Darurat Palsu",
          content: "Pemberitahuan darurat yang seharusnya wewenang Admin.",
          category: "DARURAT",
          target_role: "ALL",
          class_id: null,
          is_pinned: true,
        }),
      });

      expect(res.status).toBe(403);
    });

    it("POST /api/announcements/:id/ack berhasil mencatat pembacaan pengumuman", async () => {
      // Budi membaca anc_2
      const res = await app.request("/api/announcements/anc_2/ack", {
        method: "POST",
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.read_at).toBeDefined();

      // Pastikan sekarang is_read bernilai true
      const getRes = await app.request("/api/announcements", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      const getData = await getRes.json();
      const anc2 = getData.announcements.find((a: any) => a.id === "anc_2");
      expect(anc2.is_read).toBe(true);
    });

    it("POST /api/announcements/:id/ack NEGATIF: 404 jika ID pengumuman fiktif", async () => {
      const res = await app.request("/api/announcements/anc_non_existent/ack", {
        method: "POST",
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 2. MESSAGES & THREADS (/api/threads)
  // ==========================================
  describe("2. Messages & Threads API", () => {
    it("GET /api/threads mengembalikan daftar thread milik peserta bersangkutan dan info jam layanan", async () => {
      const res = await app.request("/api/threads", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.service_hours).toBe("Senin–Jumat, 07.00–15.00 WIB");
      expect(Array.isArray(data.threads)).toBe(true);

      const threadIds = data.threads.map((t: any) => t.id);
      expect(threadIds).toContain("th_1"); // Thread Budi & Bu Ani tentang Raka
      expect(threadIds).not.toContain("th_2"); // Thread Siti & Bu Ani tentang Dimas
    });

    it("POST /api/threads berhasil membuat percakapan baru untuk anak sendiri", async () => {
      const res = await app.request("/api/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: "std_nadia",
          teacher_id: "usr_ani",
          subject: "Konsultasi Adaptasi Belajar Nadia",
          initial_message: "Selamat siang Bu Ani, bagaimana perkembangan adaptasi Nadia?",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.thread.subject).toBe("Konsultasi Adaptasi Belajar Nadia");
      expect(data.thread.student_name).toBe("Nadia Putri");

      // Notifikasi terkirim ke Bu Ani
      const notifAni = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_ani' AND reference_id = ?"
        )
        .get(data.thread.id);
      expect(notifAni).toBeDefined();
    });

    it("POST /api/threads NEGATIF: Wali Siti mencoba membuat thread untuk Raka (anak Budi) ditolak 403", async () => {
      const res = await app.request("/api/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sitiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: "std_raka", // Anak Budi, bukan Siti!
          teacher_id: "usr_ani",
          subject: "Ingin Tahu Nilai Raka",
          initial_message: "Bisa tolong kirimkan nilai Raka?",
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN_STUDENT_ACCESS");
    });

    it("GET /api/threads/:id/messages mengembalikan riwayat pesan untuk peserta thread", async () => {
      const res = await app.request("/api/threads/th_1/messages", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.service_hours).toBe("Senin–Jumat, 07.00–15.00 WIB");
      expect(data.thread.id).toBe("th_1");
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.messages.length).toBeGreaterThanOrEqual(2);
    });

    it("GET /api/threads/:id/messages NEGATIF: Wali Siti mencoba membaca pesan th_1 (milik Budi) ditolak 403", async () => {
      const res = await app.request("/api/threads/th_1/messages", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("POST /api/threads/:id/messages berhasil mengirim balasan & memicu notifikasi", async () => {
      const res = await app.request("/api/threads/th_1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aniToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Terima kasih infonya Pak Budi, kami pantau terus.",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message.content).toBe(
        "Terima kasih infonya Pak Budi, kami pantau terus."
      );
      expect(data.message.sender_id).toBe("usr_ani");

      // Cek notifikasi terkirim ke Budi
      const notifBudi = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_budi' AND type = 'PESAN' ORDER BY created_at DESC LIMIT 1"
        )
        .get() as any;
      expect(notifBudi).toBeDefined();
      expect(notifBudi.title).toContain("Pesan baru dari");
    });

    it("POST /api/threads/:id/messages NEGATIF: Wali Siti mencoba mengirim pesan ke th_1 ditolak 403", async () => {
      const res = await app.request("/api/threads/th_1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sitiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Penyusupan pesan dari pihak ketiga",
        }),
      });

      expect(res.status).toBe(403);
    });

    it("POST /api/threads/:id/read menandai pesan lawan bicara menjadi terbaca", async () => {
      const res = await app.request("/api/threads/th_1/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Cek unread messages di th_1 untuk Budi sekarang 0
      const unreadCount = db
        .query(
          "SELECT COUNT(*) as count FROM messages WHERE thread_id = 'th_1' AND sender_id != 'usr_budi' AND is_read = 0"
        )
        .get() as { count: number };
      expect(unreadCount.count).toBe(0);
    });

    it("POST /api/threads/:id/read NEGATIF: Pihak ketiga ditolak 403", async () => {
      const res = await app.request("/api/threads/th_1/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 3. INVOICES & FINANCE (/api/invoices)
  // ==========================================
  describe("3. Invoices & Finance API", () => {
    it("GET /api/invoices oleh GUARDIAN hanya melihat tagihan anak sendiri", async () => {
      const res = await app.request("/api/invoices", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.invoices)).toBe(true);

      const invoiceIds = data.invoices.map((inv: any) => inv.id);
      expect(invoiceIds).toContain("inv_1"); // Raka (Budi)
      expect(invoiceIds).toContain("inv_3"); // Nadia (Budi)
      expect(invoiceIds).toContain("inv_4"); // Raka (Budi)
      expect(invoiceIds).not.toContain("inv_2"); // Dimas (Siti)
    });

    it("GET /api/invoices NEGATIF: Guru ditolak 403 demi isolasi data keuangan", async () => {
      const res = await app.request("/api/invoices", {
        headers: { Authorization: `Bearer ${aniToken}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("GET /api/invoices NEGATIF: Wali mencoba memfilter student_id milik anak lain ditolak 403", async () => {
      const res = await app.request("/api/invoices?student_id=std_dimas", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN_STUDENT_ACCESS");
    });

    it("POST /api/invoices oleh ADMIN berhasil membuat tagihan baru & mengirim notifikasi ke wali", async () => {
      const res = await app.request("/api/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: "std_dimas",
          title: "Iuran Praktikum Komputer",
          description: "Biaya lisensi software pembelajaran tahunan",
          amount: 75000,
          due_date: "2026-12-15",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.invoice.title).toBe("Iuran Praktikum Komputer");
      expect(data.invoice.status).toBe("UNPAID");

      // Notifikasi masuk ke wali Dimas (Siti)
      const notifSiti = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_siti' AND reference_id = ?"
        )
        .get(data.invoice.id);
      expect(notifSiti).toBeDefined();
    });

    it("POST /api/invoices NEGATIF: Wali atau Guru dilarang membuat tagihan (403)", async () => {
      const res = await app.request("/api/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: "std_raka",
          title: "Iuran Tak Berizin",
          amount: 50000,
          due_date: "2026-12-30",
        }),
      });

      expect(res.status).toBe(403);
    });

    it("POST /api/invoices/:id/submit-payment berhasil mengirim bukti & status menjadi WAITING_VERIFICATION", async () => {
      const res = await app.request("/api/invoices/inv_1/submit-payment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: "TRANSFER_BANK",
          payment_ref: "TRF-20261122-0099",
          proof_note: "Transfer via BCA Mobile a.n. Budi Santoso",
          payment_proof_url: "https://images.unsplash.com/photo-proof-budi.jpg",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoice.status).toBe("WAITING_VERIFICATION");
      expect(data.invoice.payment_ref).toBe("TRF-20261122-0099");
      expect(data.invoice.paid_at).toBeDefined();

      // Cek notifikasi terkirim ke Admin
      const notifAdmin = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_admin' AND reference_id = 'inv_1' ORDER BY created_at DESC LIMIT 1"
        )
        .get() as any;
      expect(notifAdmin).toBeDefined();
      expect(notifAdmin.type).toBe("TAGIHAN");
    });

    it("POST /api/invoices/:id/submit-payment NEGATIF: Validasi Zod menolak jika tanpa bukti/ref/note (400)", async () => {
      const res = await app.request("/api/invoices/inv_1/submit-payment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: "TRANSFER_BANK",
          payment_ref: "",
          proof_note: "",
          payment_proof_url: null,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/invoices/:id/submit-payment NEGATIF: Wali Siti mencoba membayar inv_1 milik Raka ditolak 403", async () => {
      const res = await app.request("/api/invoices/inv_1/submit-payment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sitiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_ref: "TRF-HACK-001",
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN_STUDENT_ACCESS");
    });

    it("POST /api/invoices/:id/submit-payment NEGATIF: Menolak pembayaran jika invoice sudah PAID (400)", async () => {
      const res = await app.request("/api/invoices/inv_3/submit-payment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_ref: "TRF-DOUBLE-PAY",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("ALREADY_PAID");
    });

    it("PATCH /api/invoices/:id/verify oleh ADMIN menerbitkan kuitansi KW-YYYYMM-XXXX & memicu notifikasi", async () => {
      const res = await app.request("/api/invoices/inv_1/verify", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAID",
          notes: "Dana telah masuk ke rekening kas sekolah. Terima kasih.",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoice.status).toBe("PAID");
      expect(data.invoice.verified_by).toBe("usr_admin");
      expect(data.invoice.receipt_no).toMatch(/^KW-\d{6}-\d{4}$/);

      // Notifikasi lunas terkirim ke wali Budi
      const notifBudi = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_budi' AND reference_id = 'inv_1' AND body LIKE '%nomor kuitansi%'"
        )
        .get();
      expect(notifBudi).toBeDefined();
    });

    it("PATCH /api/invoices/:id/verify untuk REJECTED mengubah status dan mengirim notifikasi alasan", async () => {
      const res = await app.request("/api/invoices/inv_2/verify", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "REJECTED",
          notes: "Mutasi bank belum tercatat pada tanggal tersebut.",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoice.status).toBe("REJECTED");
      expect(data.invoice.verified_by).toBe("usr_admin");

      // Notifikasi tolak terkirim ke wali Siti
      const notifSiti = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_siti' AND reference_id = 'inv_2' AND title LIKE '%Ditolak%'"
        )
        .get();
      expect(notifSiti).toBeDefined();
    });

    it("PATCH /api/invoices/:id/verify NEGATIF: Wali mencoba memverifikasi ditolak 403", async () => {
      const res = await app.request("/api/invoices/inv_4/verify", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${budiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAID",
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4. NOTIFICATIONS (/api/notifications)
  // ==========================================
  describe("4. Notifications API", () => {
    it("GET /api/notifications mengembalikan daftar notifikasi pengguna dan unread_count yang akurat", async () => {
      const res = await app.request("/api/notifications", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(typeof data.unread_count).toBe("number");
      expect(data.notifications.every((n: any) => n.user_id === "usr_budi")).toBe(
        true
      );
    });

    it("PATCH /api/notifications/:id/read berhasil menandai notifikasi dibaca", async () => {
      const res = await app.request("/api/notifications/ntf_2/read", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const notif = db
        .query("SELECT is_read FROM notifications WHERE id = 'ntf_2'")
        .get() as { is_read: number };
      expect(notif.is_read).toBe(1);
    });

    it("PATCH /api/notifications/:id/read NEGATIF: Menolak akses membaca notifikasi milik pengguna lain (403)", async () => {
      // Budi mencoba menandai ntf_4 milik Siti
      const res = await app.request("/api/notifications/ntf_4/read", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("POST /api/notifications/read-all berhasil menandai seluruh notifikasi belum dibaca", async () => {
      const res = await app.request("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${budiToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.updated_count).toBe("number");

      // Verifikasi unread_count sekarang 0
      const checkRes = await app.request("/api/notifications", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      const checkData = await checkRes.json();
      expect(checkData.unread_count).toBe(0);
    });
  });
});
