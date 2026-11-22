import { describe, test, expect, beforeAll } from "bun:test";
import { createDatabase } from "../src/db/client";
import { ensureSchema } from "../src/db/schema";
import { seedDatabase } from "../src/db/seed";
import { createApp } from "../src/app";

describe("NeoSchola Cross-Role E2E API Tests", () => {
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createDatabase>;

  let budiToken: string;
  let sitiToken: string;
  let aniToken: string;
  let adminToken: string;

  beforeAll(async () => {
    db = createDatabase({ inMemory: true });
    ensureSchema(db);
    await seedDatabase(db, { force: true });
    app = createApp(db);

    // Login Budi (Wali murid Raka & Nadia)
    const resBudi = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wali.budi@neoschola.demo",
        password: "neoschola123",
      }),
    });
    const dataBudi = await resBudi.json();
    budiToken = dataBudi.token;

    // Login Siti (Wali murid Dimas)
    const resSiti = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wali.siti@neoschola.demo",
        password: "neoschola123",
      }),
    });
    const dataSiti = await resSiti.json();
    sitiToken = dataSiti.token;

    // Login Ani (Guru wali kelas 4A)
    const resAni = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "guru.ani@neoschola.demo",
        password: "neoschola123",
      }),
    });
    const dataAni = await resAni.json();
    aniToken = dataAni.token;

    // Login Admin TU
    const resAdmin = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin.tu@neoschola.demo",
        password: "neoschola123",
      }),
    });
    const dataAdmin = await resAdmin.json();
    adminToken = dataAdmin.token;
  });

  // =========================================================================
  // Alur 1: Izin Wali → Persetujuan Guru → Presensi + Notifikasi
  // =========================================================================
  test("Alur 1: Izin Wali -> Persetujuan Guru -> Presensi Otomatis + Notifikasi", async () => {
    // 1. Wali Budi ajukan POST /api/leave-requests untuk 2 hari berturut-turut untuk std_raka
    const leaveRes = await app.request("/api/leave-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${budiToken}`,
      },
      body: JSON.stringify({
        student_id: "std_raka",
        leave_type: "IZIN",
        start_date: "2026-11-24",
        end_date: "2026-11-25",
        reason: "Acara keluarga tahunan di Yogyakarta",
      }),
    });
    expect(leaveRes.status).toBe(201);
    const leaveData = await leaveRes.json();
    expect(leaveData.leave_request).toBeDefined();
    const leaveId = leaveData.leave_request.id;
    expect(leaveData.leave_request.status).toBe("PENDING");

    // 2. Guru Ani lihat antrean via GET /api/leave-requests
    const listLeaveRes = await app.request("/api/leave-requests", {
      headers: { Authorization: `Bearer ${aniToken}` },
    });
    expect(listLeaveRes.status).toBe(200);
    const listLeaveData = await listLeaveRes.json();
    const foundPending = listLeaveData.items.find(
      (item: any) => item.id === leaveId
    );
    expect(foundPending).toBeDefined();
    expect(foundPending.student_id).toBe("std_raka");

    // Guru Ani setujui via PATCH /api/leave-requests/:id/review
    const reviewRes = await app.request(`/api/leave-requests/${leaveId}/review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aniToken}`,
      },
      body: JSON.stringify({
        status: "APPROVED",
        review_notes: "Disetujui. Semoga lancar acaranya dan jaga kesehatan.",
      }),
    });
    expect(reviewRes.status).toBe(200);
    const reviewData = await reviewRes.json();
    expect(reviewData.leave_request.status).toBe("APPROVED");

    // 3. Verifikasi presensi std_raka otomatis tercatat IZIN pada kedua tanggal (2026-11-24 & 2026-11-25)
    const attRes = await app.request("/api/attendance?student_id=std_raka", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(attRes.status).toBe(200);
    const attData = await attRes.json();
    const attList = attData.items || attData.attendances;
    expect(attList).toBeDefined();
    const attDates = attList.map((a: any) => ({
      date: a.date,
      status: a.status,
    }));

    const day1 = attDates.find((a: any) => a.date === "2026-11-24");
    const day2 = attDates.find((a: any) => a.date === "2026-11-25");
    expect(day1).toBeDefined();
    expect(day1.status).toBe("IZIN");
    expect(day2).toBeDefined();
    expect(day2.status).toBe("IZIN");

    // 4. Verifikasi Wali Budi menerima notifikasi persetujuan di GET /api/notifications
    const notifRes = await app.request("/api/notifications", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(notifRes.status).toBe(200);
    const notifData = await notifRes.json();
    const approvalNotif = notifData.notifications.find(
      (n: any) => n.reference_id === leaveId && n.type === "IZIN"
    );
    expect(approvalNotif).toBeDefined();
    expect(approvalNotif.title).toContain("Disetujui");
  });

  // =========================================================================
  // Alur 2: Tagihan SPP → Bayar Sandbox → Verifikasi Admin → Kuitansi + Notifikasi
  // =========================================================================
  test("Alur 2: Tagihan SPP -> Bayar Sandbox -> Verifikasi Admin -> Kuitansi KW + Notifikasi", async () => {
    // 1. Wali Budi kirim POST /api/invoices/inv_1/submit-payment
    const payRes = await app.request("/api/invoices/inv_1/submit-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${budiToken}`,
      },
      body: JSON.stringify({
        payment_method: "TRANSFER_BANK",
        payment_ref: "TRF-E2E-001",
        proof_note: "Transfer uji E2E",
      }),
    });
    expect(payRes.status).toBe(200);
    const payData = await payRes.json();
    expect(payData.invoice.status).toBe("WAITING_VERIFICATION");
    expect(payData.invoice.payment_ref).toBe("TRF-E2E-001");

    // 2. Admin TU verifikasi pembayaran via PATCH /api/invoices/inv_1/verify
    const verifyRes = await app.request("/api/invoices/inv_1/verify", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "PAID",
        notes: "Verifikasi administrasi sukses",
      }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.invoice.status).toBe("PAID");
    // Format kuitansi harus cocok /^KW-\d{6}-\d{4}$/
    expect(verifyData.invoice.receipt_no).toMatch(/^KW-\d{6}-\d{4}$/);

    // 3. Verifikasi Wali Budi menerima notifikasi penerbitan kuitansi / pembayaran diverifikasi
    const notifRes = await app.request("/api/notifications", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(notifRes.status).toBe(200);
    const notifData = await notifRes.json();
    const invoiceNotif = notifData.notifications.find(
      (n: any) =>
        n.reference_id === "inv_1" &&
        n.type === "TAGIHAN" &&
        n.title.includes("Terverifikasi")
    );
    expect(invoiceNotif).toBeDefined();
    expect(invoiceNotif.body).toContain(verifyData.invoice.receipt_no);
  });

  // =========================================================================
  // Alur 3: Pengumuman Kelas + Isolasi Lintas Wali
  // =========================================================================
  test("Alur 3: Pengumuman Kelas + Isolasi Lintas Wali", async () => {
    // 1. Guru Ani publish pengumuman kelas cls_4a via POST /api/announcements
    const postAncRes = await app.request("/api/announcements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aniToken}`,
      },
      body: JSON.stringify({
        title: "Pengumuman Proyek Sains Kelas 4A",
        content: "Seluruh siswa kelas 4A diwajibkan membawa bibit tanaman hari Senin.",
        category: "KELAS",
        target_role: "GUARDIAN",
        class_id: "cls_4a",
        is_pinned: true,
      }),
    });
    expect(postAncRes.status).toBe(201);
    const ancData = await postAncRes.json();
    const announcementId = ancData.announcement.id;

    // 2. Wali Budi dan Wali Siti (keduanya punya anak di cls_4a: Raka & Dimas) membaca pengumuman
    const budiAncRes = await app.request("/api/announcements", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(budiAncRes.status).toBe(200);
    const budiAncs = await budiAncRes.json();
    const budiSeen = budiAncs.announcements.find((a: any) => a.id === announcementId);
    expect(budiSeen).toBeDefined();
    expect(budiSeen.is_read).toBe(false);

    const sitiAncRes = await app.request("/api/announcements", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiAncRes.status).toBe(200);
    const sitiAncs = await sitiAncRes.json();
    const sitiSeen = sitiAncs.announcements.find((a: any) => a.id === announcementId);
    expect(sitiSeen).toBeDefined();

    // Keduanya panggil POST /api/announcements/:id/ack
    const budiAck = await app.request(`/api/announcements/${announcementId}/ack`, {
      method: "POST",
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(budiAck.status).toBe(200);

    const sitiAck = await app.request(`/api/announcements/${announcementId}/ack`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiAck.status).toBe(200);

    // Cek ulang is_read === true
    const budiRecheck = await app.request("/api/announcements", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    const recheckData = await budiRecheck.json();
    const recheckItem = recheckData.announcements.find((a: any) => a.id === announcementId);
    expect(recheckItem.is_read).toBe(true);

    // 3. Verifikasi Wali Siti DITOLAK 403 saat mengakses resource milik anak Wali Budi (std_raka & inv_1 & th_1)
    // a. GET /api/students/std_raka/dashboard
    const sitiDash = await app.request("/api/students/std_raka/dashboard", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiDash.status).toBe(403);

    // b. GET /api/attendance?student_id=std_raka
    const sitiAtt = await app.request("/api/attendance?student_id=std_raka", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiAtt.status).toBe(403);

    // c. GET /api/academic/grades?student_id=std_raka
    const sitiGrades = await app.request("/api/academic/grades?student_id=std_raka", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiGrades.status).toBe(403);

    // d. GET /api/invoices?student_id=std_raka
    const sitiInvoices = await app.request("/api/invoices?student_id=std_raka", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiInvoices.status).toBe(403);

    // e. POST /api/invoices/inv_1/submit-payment
    const sitiPay = await app.request("/api/invoices/inv_1/submit-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sitiToken}`,
      },
      body: JSON.stringify({
        payment_ref: "SITI-ILLEGAL-ATTEMPT",
      }),
    });
    expect(sitiPay.status).toBe(403);

    // f. GET /api/threads/th_1/messages
    const sitiThread = await app.request("/api/threads/th_1/messages", {
      headers: { Authorization: `Bearer ${sitiToken}` },
    });
    expect(sitiThread.status).toBe(403);
  });

  // =========================================================================
  // Alur 4: Pesan 1-on-1 + Unread Counter + Mark Read
  // =========================================================================
  test("Alur 4: Pesan 1-on-1 -> Unread Counter -> Mark Read -> Balas Pesan + Notifikasi", async () => {
    // 1. Wali Budi kirim pesan baru ke th_1
    const sendMsgRes = await app.request("/api/threads/th_1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${budiToken}`,
      },
      body: JSON.stringify({
        content: "Halo Bu Ani, bagaimana perkembangan belajar sains Raka hari ini?",
      }),
    });
    expect(sendMsgRes.status).toBe(201);

    // 2. Guru Ani cek GET /api/threads melihat unread_count > 0 untuk th_1
    const aniThreadsRes = await app.request("/api/threads", {
      headers: { Authorization: `Bearer ${aniToken}` },
    });
    expect(aniThreadsRes.status).toBe(200);
    const aniThreadsData = await aniThreadsRes.json();
    const th1Ani = aniThreadsData.threads.find((t: any) => t.id === "th_1");
    expect(th1Ani).toBeDefined();
    expect(th1Ani.unread_count).toBeGreaterThan(0);

    // 3. Guru Ani panggil POST /api/threads/:id/read
    const markReadRes = await app.request("/api/threads/th_1/read", {
      method: "POST",
      headers: { Authorization: `Bearer ${aniToken}` },
    });
    expect(markReadRes.status).toBe(200);

    // Cek ulang GET /api/threads melihat unread_count === 0
    const aniRecheckRes = await app.request("/api/threads", {
      headers: { Authorization: `Bearer ${aniToken}` },
    });
    const aniRecheckData = await aniRecheckRes.json();
    const th1Recheck = aniRecheckData.threads.find((t: any) => t.id === "th_1");
    expect(th1Recheck.unread_count).toBe(0);

    // 4. Guru Ani balas pesan
    const aniReplyRes = await app.request("/api/threads/th_1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aniToken}`,
      },
      body: JSON.stringify({
        content: "Alhamdulillah Raka sangat aktif dan mampu memimpin kelompoknya dengan baik, Pak.",
      }),
    });
    expect(aniReplyRes.status).toBe(201);

    // 5. Wali Budi menerima notifikasi tipe PESAN
    const budiNotifsRes = await app.request("/api/notifications", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(budiNotifsRes.status).toBe(200);
    const budiNotifsData = await budiNotifsRes.json();
    const messageNotif = budiNotifsData.notifications.find(
      (n: any) => n.reference_id === "th_1" && n.type === "PESAN"
    );
    expect(messageNotif).toBeDefined();
    expect(messageNotif.body).toContain("Alhamdulillah Raka");
  });
});
