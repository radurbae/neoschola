import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  BulkAttendanceRequestSchema,
  NotificationType,
  Role,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, requireRole, assertStudentAccess } from "../middleware/auth";
import { createNotifications, type CreateNotificationParams } from "../lib/notify";

export function createAttendanceRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  const getAttendanceHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const month = c.req.query("month");
    const from = c.req.query("from");
    const to = c.req.query("to");

    if (user.role === Role.GUARDIAN && !studentId) {
      return c.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter student_id wajib disertakan untuk wali murid.",
          },
        },
        400
      );
    }

    if (studentId) {
      const access = assertStudentAccess(db, user, studentId);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: access.reason || "Anda tidak memiliki akses ke data presensi siswa ini.",
            },
          },
          403
        );
      }
    }

    let sql = `
      SELECT a.id, a.student_id, a.class_id, a.date, a.status, a.check_in_time, a.check_out_time,
             a.notes, a.recorded_by, a.created_at, s.full_name as student_name, c.name as class_name
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (studentId) {
      sql += " AND a.student_id = ?";
      params.push(studentId);
    } else if (user.role === Role.TEACHER) {
      sql += " AND a.class_id IN (SELECT id FROM classes WHERE homeroom_teacher_id = ?)";
      params.push(user.id);
    }

    if (month) {
      sql += " AND strftime('%Y-%m', a.date) = ?";
      params.push(month);
    }
    if (from) {
      sql += " AND a.date >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND a.date <= ?";
      params.push(to);
    }

    sql += " ORDER BY a.date DESC, a.created_at DESC";

    const items = db.query(sql).all(...params);
    return c.json({ items });
  };

  const getClassAttendanceHandler = async (c: any) => {
    const user = c.get("user");
    const classId = c.req.query("class_id");
    const dateParam = c.req.query("date");

    if (!classId) {
      return c.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter class_id wajib disertakan.",
          },
        },
        400
      );
    }

    if (user.role === Role.TEACHER) {
      const cls = db
        .query("SELECT homeroom_teacher_id FROM classes WHERE id = ?")
        .get(classId) as { homeroom_teacher_id: string | null } | null;

      if (!cls || cls.homeroom_teacher_id !== user.id) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Anda bukan wali kelas dari kelas ini.",
            },
          },
          403
        );
      }
    }

    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const date = dateParam || todayStr;

    const items = db
      .query(
        `SELECT s.id as student_id, s.nis, s.full_name as student_name,
                a.id as attendance_id, a.status, a.check_in_time, a.check_out_time, a.notes
         FROM students s
         LEFT JOIN attendances a ON s.id = a.student_id AND a.date = ?
         WHERE s.class_id = ? AND s.is_active = 1
         ORDER BY s.full_name ASC`
      )
      .all(date, classId);

    return c.json({
      class_id: classId,
      date,
      items,
    });
  };

  const postBulkAttendanceHandler = async (c: any) => {
    const user = c.get("user");
    const rawBody = await c.req.json().catch(() => null);
    const parsed = BulkAttendanceRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format data presensi massal tidak valid.",
          },
        },
        400
      );
    }

    const { class_id, date, attendances } = parsed.data;

    if (user.role === Role.TEACHER) {
      const cls = db
        .query("SELECT homeroom_teacher_id FROM classes WHERE id = ?")
        .get(class_id) as { homeroom_teacher_id: string | null } | null;

      if (!cls || cls.homeroom_teacher_id !== user.id) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Anda bukan wali kelas dari kelas ini.",
            },
          },
          403
        );
      }
    }

    const upsertStmt = db.prepare(`
      INSERT INTO attendances (id, student_id, class_id, date, status, notes, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(student_id, date) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        recorded_by = excluded.recorded_by
    `);

    const notifications: CreateNotificationParams[] = [];

    const runBulk = db.transaction(() => {
      for (const item of attendances) {
        const id = `att_${crypto.randomUUID().slice(0, 10)}`;
        upsertStmt.run(
          id,
          item.student_id,
          class_id,
          date,
          item.status,
          item.notes || null,
          user.id
        );

        if (item.status !== "HADIR") {
          const student = db
            .query("SELECT full_name FROM students WHERE id = ?")
            .get(item.student_id) as { full_name: string } | null;

          const guardians = db
            .query("SELECT guardian_id FROM guardian_students WHERE student_id = ?")
            .all(item.student_id) as { guardian_id: string }[];

          for (const g of guardians) {
            notifications.push({
              userId: g.guardian_id,
              title: "Pemberitahuan Presensi",
              body: `Presensi ${student?.full_name || "Siswa"} pada tanggal ${date}: ${item.status}${
                item.notes ? ` (${item.notes})` : ""
              }.`,
              type: NotificationType.PRESENSI,
              referenceId: item.student_id,
            });
          }
        }
      }
    });

    runBulk();

    if (notifications.length > 0) {
      createNotifications(db, notifications);
    }

    return c.json({
      success: true,
      recorded_count: attendances.length,
    });
  };

  // Support both direct mount and sub-app path prefixes
  router.get("/", requireAuth(db), getAttendanceHandler);
  router.get("/api/attendance", requireAuth(db), getAttendanceHandler);

  router.get(
    "/class",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    getClassAttendanceHandler
  );
  router.get(
    "/api/attendance/class",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    getClassAttendanceHandler
  );

  router.post(
    "/bulk",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postBulkAttendanceHandler
  );
  router.post(
    "/api/attendance/bulk",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postBulkAttendanceHandler
  );

  return router;
}
