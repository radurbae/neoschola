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

describe("Preclient Enhancements (Delegate A)", () => {
  let app: ReturnType<typeof createApp>;
  let db: Database;

  let budiToken: string;
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

  test("1. GET /api/students dan GET /api/auth/me menyertakan homeroom teacher info", async () => {
    // Check GET /api/students as Guardian (Budi)
    const resStudents = await app.request("/api/students", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(resStudents.status).toBe(200);
    const dataStudents = await resStudents.json();
    const raka = dataStudents.students.find((s: any) => s.id === "std_raka");
    const nadia = dataStudents.students.find((s: any) => s.id === "std_nadia");

    expect(raka).toBeDefined();
    expect(raka.homeroom_teacher_id).toBe("usr_ani");
    expect(raka.homeroom_teacher_name).toBe("Ani Wijayanti, S.Pd.");

    expect(nadia).toBeDefined();
    expect(nadia.homeroom_teacher_id).toBeNull();
    expect(nadia.homeroom_teacher_name).toBeNull();

    // Check GET /api/auth/me as Guardian (Budi)
    const resMe = await app.request("/api/auth/me", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(resMe.status).toBe(200);
    const dataMe = await resMe.json();
    const meRaka = dataMe.students.find((s: any) => s.id === "std_raka");
    const meNadia = dataMe.students.find((s: any) => s.id === "std_nadia");

    expect(meRaka.homeroom_teacher_id).toBe("usr_ani");
    expect(meRaka.homeroom_teacher_name).toBe("Ani Wijayanti, S.Pd.");
    expect(meNadia.homeroom_teacher_id).toBeNull();
    expect(meNadia.homeroom_teacher_name).toBeNull();
  });

  test("2. GET /api/students/std_raka/dashboard mengembalikan attendance_trends dan merespons mutasi bulk", async () => {
    const resDash = await app.request("/api/students/std_raka/dashboard", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(resDash.status).toBe(200);
    const dataDash = await resDash.json();

    expect(dataDash.student.homeroom_teacher_id).toBe("usr_ani");
    expect(dataDash.student.homeroom_teacher_name).toBe("Ani Wijayanti, S.Pd.");
    expect(dataDash.attendance_summary).toBeDefined();
    expect(dataDash.attendance_trends).toBeDefined();
    expect(dataDash.attendance_trends["7H"]).toBeDefined();
    expect(dataDash.attendance_trends["30H"]).toBeDefined();
    expect(dataDash.attendance_trends["Sem"]).toBeDefined();
    expect(Array.isArray(dataDash.attendance_trends["7H"].points)).toBe(true);

    const prev7HTotal = dataDash.attendance_trends["7H"].total;
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

    // Ani ubah presensi massal kelas 4A hari ini: Raka SAKIT
    const resBulk = await app.request("/api/attendance/bulk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aniToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        class_id: "cls_4a",
        date: todayStr,
        attendances: [
          { student_id: "std_raka", status: "SAKIT", notes: "Demam berdarah" },
          { student_id: "std_dimas", status: "HADIR", notes: "" },
        ],
      }),
    });
    expect(resBulk.status).toBe(200);

    // Re-check dashboard Raka
    const resDashAfter = await app.request("/api/students/std_raka/dashboard", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    const dataDashAfter = await resDashAfter.json();
    expect(dataDashAfter.attendance_today?.status).toBe("SAKIT");
    expect(dataDashAfter.attendance_trends["7H"].points.length).toBeGreaterThan(0);
  });

  test("3. GET /api/attendance/summary RBAC dan akurasi data guru & admin", async () => {
    // Guardian -> 403
    const resGuardian = await app.request("/api/attendance/summary", {
      headers: { Authorization: `Bearer ${budiToken}` },
    });
    expect(resGuardian.status).toBe(403);

    // Teacher Ani -> 200, total_students = 2 (kelas 4A: Raka, Dimas)
    const resTeacher = await app.request("/api/attendance/summary", {
      headers: { Authorization: `Bearer ${aniToken}` },
    });
    expect(resTeacher.status).toBe(200);
    const dataTeacher = await resTeacher.json();

    expect(dataTeacher.total_students).toBe(2);
    expect(dataTeacher.periods["1M"]).toBeDefined();
    expect(dataTeacher.periods["1B"]).toBeDefined();
    expect(dataTeacher.today.sakit).toBe(1);
    expect(dataTeacher.today.hadir).toBe(1);
    expect(dataTeacher.today.recorded).toBe(2);
    expect(dataTeacher.today.percentage).toBe(50);

    // Admin -> 200, total_students = 3 (Raka, Nadia, Dimas)
    const resAdmin = await app.request("/api/attendance/summary", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resAdmin.status).toBe(200);
    const dataAdmin = await resAdmin.json();
    expect(dataAdmin.total_students).toBe(3);
    expect(dataAdmin.periods["1M"]).toBeDefined();
    expect(dataAdmin.periods["1B"]).toBeDefined();
  });
});
