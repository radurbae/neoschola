import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { Role } from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, assertStudentAccess } from "../middleware/auth";
import { buildStudentAttendanceTrends } from "../lib/attendanceTrend";

export function createStudentRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  const getStudentsHandler = async (c: any) => {
    const user = c.get("user");
    let rows: any[] = [];

    if (user.role === Role.GUARDIAN) {
      rows = db
        .query(
          `SELECT s.id, s.nis, s.nisn, s.full_name, s.nickname, s.class_id, c.name as class_name,
                  c.homeroom_teacher_id, ht.name as homeroom_teacher_name,
                  s.gender, s.birth_date, s.is_active, s.created_at
           FROM students s
           JOIN guardian_students gs ON s.id = gs.student_id
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN users ht ON c.homeroom_teacher_id = ht.id
           WHERE gs.guardian_id = ?
           ORDER BY s.full_name ASC`
        )
        .all(user.id);
    } else if (user.role === Role.TEACHER) {
      rows = db
        .query(
          `SELECT s.id, s.nis, s.nisn, s.full_name, s.nickname, s.class_id, c.name as class_name,
                  c.homeroom_teacher_id, ht.name as homeroom_teacher_name,
                  s.gender, s.birth_date, s.is_active, s.created_at
           FROM students s
           JOIN classes c ON s.class_id = c.id
           LEFT JOIN users ht ON c.homeroom_teacher_id = ht.id
           WHERE c.homeroom_teacher_id = ?
           ORDER BY s.full_name ASC`
        )
        .all(user.id);
    } else {
      // ADMIN
      rows = db
        .query(
          `SELECT s.id, s.nis, s.nisn, s.full_name, s.nickname, s.class_id, c.name as class_name,
                  c.homeroom_teacher_id, ht.name as homeroom_teacher_name,
                  s.gender, s.birth_date, s.is_active, s.created_at
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN users ht ON c.homeroom_teacher_id = ht.id
           ORDER BY s.full_name ASC`
        )
        .all();
    }

    const students = rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));

    return c.json({ students });
  };

  const getStudentDashboardHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.param("id");

    const access = assertStudentAccess(db, user, studentId);
    if (!access.allowed) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: access.reason || "Anda tidak memiliki akses ke data siswa ini.",
          },
        },
        403
      );
    }

    const studentRow = db
      .query(
        `SELECT s.id, s.nis, s.nisn, s.full_name, s.nickname, s.class_id, c.name as class_name,
                c.homeroom_teacher_id, ht.name as homeroom_teacher_name,
                s.gender, s.birth_date, s.is_active, s.created_at
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN users ht ON c.homeroom_teacher_id = ht.id
         WHERE s.id = ?`
      )
      .get(studentId) as any | null;

    if (!studentRow) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Siswa tidak ditemukan.",
          },
        },
        404
      );
    }

    const student = {
      ...studentRow,
      is_active: Boolean(studentRow.is_active),
    };

    // Hari ini (WIB / YYYY-MM-DD)
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

    // 1. Attendance Today
    const attToday = db
      .query(
        `SELECT status, check_in_time, check_out_time
         FROM attendances
         WHERE student_id = ? AND date = ?`
      )
      .get(studentId, today) as {
      status: string;
      check_in_time: string | null;
      check_out_time: string | null;
    } | null;

    const attendance_today = attToday
      ? {
          status: attToday.status,
          check_in_time: attToday.check_in_time ?? null,
          check_out_time: attToday.check_out_time ?? null,
        }
      : null;

    // 2. Attendance Summary
    const attCounts = db
      .query(
        `SELECT status, COUNT(*) as count
         FROM attendances
         WHERE student_id = ?
         GROUP BY status`
      )
      .all(studentId) as { status: string; count: number }[];

    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    for (const ac of attCounts) {
      if (ac.status === "HADIR") hadir = ac.count;
      else if (ac.status === "SAKIT") sakit = ac.count;
      else if (ac.status === "IZIN") izin = ac.count;
      else if (ac.status === "ALPA") alpa = ac.count;
    }

    const totalAttendance = hadir + sakit + izin + alpa;
    const percentage =
      totalAttendance > 0 ? Math.round((hadir / totalAttendance) * 1000) / 10 : 100.0;

    // Attendance Trends
    const attRows = db
      .query(
        `SELECT date, status
         FROM attendances
         WHERE student_id = ?
         ORDER BY date ASC`
      )
      .all(studentId) as { date: string; status: string }[];
    const attendance_trends = buildStudentAttendanceTrends(attRows, today);

    // 3. Schedules Today
    const dayOfWeekMap: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
      0: "SENIN", // Default Senin jika Minggu agar demo tetap informatif
    };
    const dayIndex = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getDay();
    const dayName = dayOfWeekMap[dayIndex] || "SENIN";

    const schedules_today = db
      .query(
        `SELECT id, class_id, day_of_week, start_time, end_time, subject, teacher_name, room, created_at
         FROM schedules
         WHERE class_id = ? AND day_of_week = ?
         ORDER BY start_time ASC`
      )
      .all(student.class_id, dayName);

    // 4. Assignments Active
    let assignments_active = db
      .query(
        `SELECT a.id, a.class_id, a.title, a.description, a.subject, a.due_date, a.assigned_by, a.created_at,
                u.name as assigned_by_name
         FROM assignments a
         LEFT JOIN users u ON a.assigned_by = u.id
         WHERE a.class_id = ? AND a.due_date >= ?
         ORDER BY a.due_date ASC`
      )
      .all(student.class_id, today) as any[];

    if (assignments_active.length === 0) {
      assignments_active = db
        .query(
          `SELECT a.id, a.class_id, a.title, a.description, a.subject, a.due_date, a.assigned_by, a.created_at,
                  u.name as assigned_by_name
           FROM assignments a
           LEFT JOIN users u ON a.assigned_by = u.id
           WHERE a.class_id = ?
           ORDER BY a.due_date DESC
           LIMIT 5`
        )
        .all(student.class_id) as any[];
    }

    // 5. Unread Announcements Count
    const unreadAnnouncements = db
      .query(
        `SELECT COUNT(*) as count
         FROM announcements a
         WHERE (a.class_id IS NULL OR a.class_id = ?)
           AND (a.target_role IN ('ALL', ?))
           AND NOT EXISTS (
             SELECT 1 FROM announcement_reads ar
             WHERE ar.announcement_id = a.id AND ar.user_id = ?
           )`
      )
      .get(student.class_id, user.role, user.id) as { count: number };

    // 6. Unpaid Invoices Count
    const unpaidInvoices = db
      .query(
        `SELECT COUNT(*) as count
         FROM invoices
         WHERE student_id = ? AND status IN ('UNPAID', 'OVERDUE')`
      )
      .get(studentId) as { count: number };

    return c.json({
      student,
      attendance_today,
      attendance_summary: {
        hadir,
        sakit,
        izin,
        alpa,
        percentage,
      },
      attendance_trends,
      schedules_today,
      assignments_active,
      unread_announcements_count: unreadAnnouncements.count,
      unpaid_invoices_count: unpaidInvoices.count,
    });
  };

  // Support both direct mount and sub-app path prefixes
  router.get("/", requireAuth(db), getStudentsHandler);
  router.get("/api/students", requireAuth(db), getStudentsHandler);

  router.get("/:id/dashboard", requireAuth(db), getStudentDashboardHandler);
  router.get("/api/students/:id/dashboard", requireAuth(db), getStudentDashboardHandler);

  return router;
}
