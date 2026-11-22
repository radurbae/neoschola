import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { createApp } from "../src/app";
import { ensureSchema } from "../src/db/schema";
import { seedDatabase } from "../src/db/seed";
import { createAuthRoutes } from "../src/routes/auth";
import { createStudentRoutes } from "../src/routes/students";
import { createAttendanceRoutes } from "../src/routes/attendance";
import { createLeaveRequestRoutes } from "../src/routes/leaveRequests";
import { createAcademicRoutes } from "../src/routes/academic";
import { Role } from "@neoschola/shared";

function setupTestApp() {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  const app = createApp(db);
  // Mount routes
  app.route("/api/auth", createAuthRoutes(db));
  app.route("/api/students", createStudentRoutes(db));
  app.route("/api/attendance", createAttendanceRoutes(db));
  app.route("/api/leave-requests", createLeaveRequestRoutes(db));
  app.route("/api/academic", createAcademicRoutes(db));

  return { app, db };
}

describe("Core API Routes & RBAC Isolation", () => {
  let app: ReturnType<typeof createApp>;
  let db: Database;

  let budiToken: string;
  let sitiToken: string;
  let aniToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const setup = setupTestApp();
    app = setup.app;
    db = setup.db;
    await seedDatabase(db, { force: true });

    // Login Budi (Wali murid Raka & Nadia)
    const resBudi = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wali.budi@neoschola.demo", password: "neoschola123" }),
    });
    const dataBudi = await resBudi.json();
    budiToken = dataBudi.token;

    // Login Siti (Wali murid Dimas)
    const resSiti = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wali.siti@neoschola.demo", password: "neoschola123" }),
    });
    const dataSiti = await resSiti.json();
    sitiToken = dataSiti.token;

    // Login Ani (Guru wali kelas 4A)
    const resAni = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "guru.ani@neoschola.demo", password: "neoschola123" }),
    });
    const dataAni = await resAni.json();
    aniToken = dataAni.token;

    // Login Admin TU
    const resAdmin = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin.tu@neoschola.demo", password: "neoschola123" }),
    });
    const dataAdmin = await resAdmin.json();
    adminToken = dataAdmin.token;
  });

  // ==========================================
  // 1. Auth Tests
  // ==========================================
  describe("Auth Routes (/api/auth)", () => {
    test("POST /api/auth/login berhasil untuk semua akun demo dan gagal jika password salah", async () => {
      expect(budiToken).toBeDefined();
      expect(sitiToken).toBeDefined();
      expect(aniToken).toBeDefined();
      expect(adminToken).toBeDefined();

      const failedRes = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wali.budi@neoschola.demo", password: "wrongpassword" }),
      });
      expect(failedRes.status).toBe(401);
      const failedData = await failedRes.json();
      expect(failedData.error.code).toBe("INVALID_CREDENTIALS");
    });

    test("GET /api/auth/me mengembalikan info profil sesuai peran", async () => {
      // Guardian
      const resBudi = await app.request("/api/auth/me", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resBudi.status).toBe(200);
      const budiMe = await resBudi.json();
      expect(budiMe.user.role).toBe(Role.GUARDIAN);
      expect(budiMe.students.length).toBe(2);

      // Teacher
      const resAni = await app.request("/api/auth/me", {
        headers: { Authorization: `Bearer ${aniToken}` },
      });
      expect(resAni.status).toBe(200);
      const aniMe = await resAni.json();
      expect(aniMe.user.role).toBe(Role.TEACHER);
      expect(aniMe.classes.length).toBeGreaterThan(0);

      // Admin
      const resAdmin = await app.request("/api/auth/me", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resAdmin.status).toBe(200);
      const adminMe = await resAdmin.json();
      expect(adminMe.user.role).toBe(Role.ADMIN);
      expect(adminMe.classes.length).toBeGreaterThan(0);

      // Unauthorized
      const noAuthRes = await app.request("/api/auth/me");
      expect(noAuthRes.status).toBe(401);
    });
  });

  // ==========================================
  // 2. Students & Dashboard Tests
  // ==========================================
  describe("Students Routes (/api/students)", () => {
    test("GET /api/students memfilter daftar siswa sesuai peran", async () => {
      const resBudi = await app.request("/api/students", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resBudi.status).toBe(200);
      const dataBudi = await resBudi.json();
      expect(dataBudi.students.length).toBe(2);
      expect(dataBudi.students.map((s: any) => s.id)).toContain("std_raka");
      expect(dataBudi.students.map((s: any) => s.id)).toContain("std_nadia");

      const resSiti = await app.request("/api/students", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(resSiti.status).toBe(200);
      const dataSiti = await resSiti.json();
      expect(dataSiti.students.length).toBe(1);
      expect(dataSiti.students[0].id).toBe("std_dimas");

      const resAdmin = await app.request("/api/students", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(resAdmin.status).toBe(200);
      const dataAdmin = await resAdmin.json();
      expect(dataAdmin.students.length).toBe(3);
    });

    test("GET /api/students/:id/dashboard mengembalikan metrik lengkap", async () => {
      const res = await app.request("/api/students/std_raka/dashboard", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.student.id).toBe("std_raka");
      expect(data.attendance_summary).toBeDefined();
      expect(typeof data.attendance_summary.hadir).toBe("number");
      expect(typeof data.attendance_summary.percentage).toBe("number");
      expect(Array.isArray(data.schedules_today)).toBe(true);
      expect(Array.isArray(data.assignments_active)).toBe(true);
      expect(typeof data.unread_announcements_count).toBe("number");
      expect(typeof data.unpaid_invoices_count).toBe("number");
    });

    test("GET /api/students/:id/dashboard mengembalikan 403 jika wali murid tidak berhak (Siti mengakses Raka)", async () => {
      const res = await app.request("/api/students/std_raka/dashboard", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  // ==========================================
  // 3. Attendance Tests
  // ==========================================
  describe("Attendance Routes (/api/attendance)", () => {
    test("GET /api/attendance memverifikasi isolasi student_id", async () => {
      // Budi mengakses Raka (berhasil)
      const resOk = await app.request("/api/attendance?student_id=std_raka", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resOk.status).toBe(200);
      const dataOk = await resOk.json();
      expect(Array.isArray(dataOk.items)).toBe(true);

      // Siti mengakses Raka (403)
      const resForbidden = await app.request("/api/attendance?student_id=std_raka", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(resForbidden.status).toBe(403);

      // Wali murid tanpa student_id (400)
      const resNoParam = await app.request("/api/attendance", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resNoParam.status).toBe(400);
    });

    test("GET /api/attendance/class & POST /api/attendance/bulk oleh Guru", async () => {
      // Guru Ani melihat kelas 4A binaannya
      const resClass = await app.request("/api/attendance/class?class_id=cls_4a&date=2026-11-25", {
        headers: { Authorization: `Bearer ${aniToken}` },
      });
      expect(resClass.status).toBe(200);
      const dataClass = await resClass.json();
      expect(dataClass.class_id).toBe("cls_4a");
      expect(Array.isArray(dataClass.items)).toBe(true);

      // Guru Ani mencoba melihat kelas 2B (bukan binaannya -> 403)
      const resClassForbidden = await app.request("/api/attendance/class?class_id=cls_2b&date=2026-11-25", {
        headers: { Authorization: `Bearer ${aniToken}` },
      });
      expect(resClassForbidden.status).toBe(403);

      // Bulk attendance input oleh Ani
      const resBulk = await app.request("/api/attendance/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aniToken}`,
        },
        body: JSON.stringify({
          class_id: "cls_4a",
          date: "2026-11-25",
          attendances: [
            { student_id: "std_raka", status: "HADIR", notes: "Tepat waktu" },
            { student_id: "std_dimas", status: "SAKIT", notes: "Demam berdarah" },
          ],
        }),
      });
      expect(resBulk.status).toBe(200);
      const dataBulk = await resBulk.json();
      expect(dataBulk.success).toBe(true);
      expect(dataBulk.recorded_count).toBe(2);

      // Verifikasi notifikasi terkirim ke wali Siti untuk Dimas yang SAKIT
      const notifSiti = db
        .query("SELECT * FROM notifications WHERE user_id = 'usr_siti' AND type = 'PRESENSI'")
        .all();
      expect(notifSiti.length).toBeGreaterThan(0);

      // Wali Budi dilarang memanggil bulk attendance (403)
      const resBulkGuardian = await app.request("/api/attendance/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${budiToken}`,
        },
        body: JSON.stringify({
          class_id: "cls_4a",
          date: "2026-11-25",
          attendances: [{ student_id: "std_raka", status: "HADIR" }],
        }),
      });
      expect(resBulkGuardian.status).toBe(403);
    });
  });

  // ==========================================
  // 4. Leave Requests Tests
  // ==========================================
  describe("Leave Request Routes (/api/leave-requests)", () => {
    let createdLeaveId: string;

    test("POST /api/leave-requests membuat permohonan izin dengan validasi ketat", async () => {
      // Tanggal tidak valid (end_date < start_date -> 400)
      const resInvalidDate = await app.request("/api/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${budiToken}`,
        },
        body: JSON.stringify({
          student_id: "std_raka",
          leave_type: "SAKIT",
          start_date: "2026-11-28",
          end_date: "2026-11-27",
          reason: "Salah tanggal",
        }),
      });
      expect(resInvalidDate.status).toBe(400);

      // Siti mencoba membuat izin untuk Raka (403)
      const resForbiddenChild = await app.request("/api/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sitiToken}`,
        },
        body: JSON.stringify({
          student_id: "std_raka",
          leave_type: "SAKIT",
          start_date: "2026-11-28",
          end_date: "2026-11-29",
          reason: "Anak orang lain",
        }),
      });
      expect(resForbiddenChild.status).toBe(403);

      // Budi membuat izin sah untuk Raka
      const resOk = await app.request("/api/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${budiToken}`,
        },
        body: JSON.stringify({
          student_id: "std_raka",
          leave_type: "IZIN",
          start_date: "2026-12-01",
          end_date: "2026-12-02",
          reason: "Khitanan keluarga besar",
        }),
      });
      expect(resOk.status).toBe(201);
      const dataOk = await resOk.json();
      expect(dataOk.leave_request.status).toBe("PENDING");
      createdLeaveId = dataOk.leave_request.id;

      // Verifikasi notifikasi terkirim ke wali kelas Ani
      const notifAni = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_ani' AND type = 'IZIN' AND reference_id = ?"
        )
        .get(createdLeaveId);
      expect(notifAni).toBeDefined();
    });

    test("PATCH /api/leave-requests/:id/review menyetujui izin & upsert presensi otomatis", async () => {
      // Guardian dilarang me-review (403)
      const resGuardianReview = await app.request(
        `/api/leave-requests/${createdLeaveId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${budiToken}`,
          },
          body: JSON.stringify({ status: "APPROVED", review_notes: "Disetujui sendiri" }),
        }
      );
      expect(resGuardianReview.status).toBe(403);

      // Guru Ani me-review dan APPROVE
      const resApprove = await app.request(
        `/api/leave-requests/${createdLeaveId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aniToken}`,
          },
          body: JSON.stringify({
            status: "APPROVED",
            review_notes: "Semoga berkah khitanannya.",
          }),
        }
      );
      expect(resApprove.status).toBe(200);
      const dataApprove = await resApprove.json();
      expect(dataApprove.leave_request.status).toBe("APPROVED");

      // Verifikasi presensi 2026-12-01 & 2026-12-02 otomatis ter-upsert dengan status IZIN
      const attDay1 = db
        .query("SELECT * FROM attendances WHERE student_id = 'std_raka' AND date = '2026-12-01'")
        .get() as any;
      const attDay2 = db
        .query("SELECT * FROM attendances WHERE student_id = 'std_raka' AND date = '2026-12-02'")
        .get() as any;
      expect(attDay1?.status).toBe("IZIN");
      expect(attDay2?.status).toBe("IZIN");

      // Verifikasi notifikasi sampai ke wali murid Budi
      const notifBudi = db
        .query(
          "SELECT * FROM notifications WHERE user_id = 'usr_budi' AND type = 'IZIN' AND reference_id = ?"
        )
        .get(createdLeaveId);
      expect(notifBudi).toBeDefined();
    });
  });

  // ==========================================
  // 5. Academic Tests (Schedule, Assignments, Grades)
  // ==========================================
  describe("Academic Routes (/api/academic)", () => {
    test("GET /api/academic/schedule memverifikasi akses", async () => {
      // Budi mengakses jadwal Raka
      const resBudi = await app.request("/api/academic/schedule?student_id=std_raka", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resBudi.status).toBe(200);
      const dataBudi = await resBudi.json();
      expect(Array.isArray(dataBudi.schedules)).toBe(true);

      // Siti mengakses jadwal Raka (403)
      const resSiti = await app.request("/api/academic/schedule?student_id=std_raka", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(resSiti.status).toBe(403);
    });

    test("POST & GET /api/academic/assignments memverifikasi RBAC", async () => {
      // Guru Ani membuat tugas di kelas 4A binaannya
      const resCreate = await app.request("/api/academic/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aniToken}`,
        },
        body: JSON.stringify({
          class_id: "cls_4a",
          title: "Proyek Miniatur Tata Surya",
          description: "Gunakan plastisin atau bola gabus berdiameter beda.",
          subject: "IPAS",
          due_date: "2026-12-05",
        }),
      });
      expect(resCreate.status).toBe(201);
      const dataCreate = await resCreate.json();
      expect(dataCreate.assignment.title).toBe("Proyek Miniatur Tata Surya");

      // Guru Ani mencoba membuat tugas di kelas 2B (bukan binaannya -> 403)
      const resForbiddenClass = await app.request("/api/academic/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aniToken}`,
        },
        body: JSON.stringify({
          class_id: "cls_2b",
          title: "Tugas Salah Kelas",
          description: "Tidak boleh",
          subject: "Tematik",
          due_date: "2026-12-05",
        }),
      });
      expect(resForbiddenClass.status).toBe(403);

      // Guardian dilarang membuat tugas (403)
      const resGuardianCreate = await app.request("/api/academic/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${budiToken}`,
        },
        body: JSON.stringify({
          class_id: "cls_4a",
          title: "Tugas Palsu",
          description: "Hacking",
          subject: "IPAS",
          due_date: "2026-12-05",
        }),
      });
      expect(resGuardianCreate.status).toBe(403);

      // Budi membaca tugas Raka
      const resGetAsg = await app.request("/api/academic/assignments?student_id=std_raka", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resGetAsg.status).toBe(200);
      const dataGetAsg = await resGetAsg.json();
      expect(dataGetAsg.assignments.some((a: any) => a.title === "Proyek Miniatur Tata Surya")).toBe(true);

      // Siti mencoba membaca tugas Raka (403)
      const resSitiAsg = await app.request("/api/academic/assignments?student_id=std_raka", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(resSitiAsg.status).toBe(403);
    });

    test("POST & GET /api/academic/grades memverifikasi RBAC dan isolasi", async () => {
      // Guru Ani menginput nilai untuk Raka
      const resPostGrade = await app.request("/api/academic/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aniToken}`,
        },
        body: JSON.stringify({
          student_id: "std_raka",
          subject: "IPAS",
          semester: 1,
          academic_year: "2026/2027",
          score: 95,
          notes: "Pemahaman luar biasa pada konsep rotasi bumi.",
        }),
      });
      expect(resPostGrade.status).toBe(201);
      const dataGrade = await resPostGrade.json();
      expect(dataGrade.grade_note.score).toBe(95);

      // Guru Ani mencoba menginput nilai untuk Nadia di kelas 2B (403)
      const resForbiddenTeacher = await app.request("/api/academic/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aniToken}`,
        },
        body: JSON.stringify({
          student_id: "std_nadia",
          subject: "Seni",
          semester: 1,
          academic_year: "2026/2027",
          score: 90,
        }),
      });
      expect(resForbiddenTeacher.status).toBe(403);

      // Guardian dilarang menginput nilai (403)
      const resGuardianPost = await app.request("/api/academic/grades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${budiToken}`,
        },
        body: JSON.stringify({
          student_id: "std_raka",
          subject: "IPAS",
          semester: 1,
          academic_year: "2026/2027",
          score: 100,
        }),
      });
      expect(resGuardianPost.status).toBe(403);

      // Budi membaca nilai Raka
      const resBudiGrades = await app.request("/api/academic/grades?student_id=std_raka", {
        headers: { Authorization: `Bearer ${budiToken}` },
      });
      expect(resBudiGrades.status).toBe(200);
      const dataBudiGrades = await resBudiGrades.json();
      expect(dataBudiGrades.grades.some((g: any) => g.score === 95)).toBe(true);

      // Siti membaca nilai Raka (403)
      const resSitiGrades = await app.request("/api/academic/grades?student_id=std_raka", {
        headers: { Authorization: `Bearer ${sitiToken}` },
      });
      expect(resSitiGrades.status).toBe(403);
    });
  });
});
