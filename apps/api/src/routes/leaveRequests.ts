import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  CreateLeaveRequestSchema,
  NotificationType,
  ReviewLeaveRequestSchema,
  Role,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, requireRole, assertStudentAccess } from "../middleware/auth";
import { createNotification, createNotifications, type CreateNotificationParams } from "../lib/notify";

export function createLeaveRequestRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  const getLeaveRequestsHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.query("student_id");

    if (studentId) {
      const access = assertStudentAccess(db, user, studentId);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: access.reason || "Anda tidak memiliki akses ke pengajuan izin siswa ini.",
            },
          },
          403
        );
      }
    }

    let sql = `
      SELECT lr.id, lr.student_id, lr.guardian_id, lr.leave_type, lr.start_date, lr.end_date,
             lr.reason, lr.attachment_url, lr.status, lr.reviewed_by, lr.reviewed_at, lr.review_notes,
             lr.created_at, s.full_name as student_name, c.name as class_name, u.name as guardian_name
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN users u ON lr.guardian_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === Role.GUARDIAN) {
      sql += " AND lr.guardian_id = ?";
      params.push(user.id);
    } else if (user.role === Role.TEACHER) {
      sql += " AND c.homeroom_teacher_id = ?";
      params.push(user.id);
    }

    if (studentId) {
      sql += " AND lr.student_id = ?";
      params.push(studentId);
    }

    sql += " ORDER BY lr.created_at DESC";

    const items = db.query(sql).all(...params);
    return c.json({ items });
  };

  const postLeaveRequestHandler = async (c: any) => {
    const user = c.get("user");
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateLeaveRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format pengajuan izin tidak valid.",
          },
        },
        400
      );
    }

    const data = parsed.data;

    const access = assertStudentAccess(db, user, data.student_id);
    if (!access.allowed) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: access.reason || "Anda tidak memiliki hak untuk mengajukan izin bagi siswa ini.",
          },
        },
        403
      );
    }

    if (data.end_date < data.start_date) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
          },
        },
        400
      );
    }

    const id = `lvr_${crypto.randomUUID().slice(0, 10)}`;

    db.prepare(`
      INSERT INTO leave_requests (id, student_id, guardian_id, leave_type, start_date, end_date, reason, attachment_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))
    `).run(
      id,
      data.student_id,
      user.id,
      data.leave_type,
      data.start_date,
      data.end_date,
      data.reason,
      data.attachment_url ?? null
    );

    const inserted = db
      .query(
        `SELECT lr.*, s.full_name as student_name, c.name as class_name, u.name as guardian_name,
                c.homeroom_teacher_id
         FROM leave_requests lr
         JOIN students s ON lr.student_id = s.id
         JOIN classes c ON s.class_id = c.id
         JOIN users u ON lr.guardian_id = u.id
         WHERE lr.id = ?`
      )
      .get(id) as any;

    // Kirim notifikasi ke wali kelas (atau admin jika belum ada wali kelas)
    if (inserted?.homeroom_teacher_id) {
      createNotification(db, {
        userId: inserted.homeroom_teacher_id,
        title: "Pengajuan Izin Siswa Baru",
        body: `${user.name} mengajukan izin ${data.leave_type} untuk ${inserted.student_name} (${data.start_date} s.d. ${data.end_date}).`,
        type: NotificationType.IZIN,
        referenceId: id,
      });
    } else {
      const admins = db
        .query("SELECT id FROM users WHERE role = 'ADMIN'")
        .all() as { id: string }[];
      const adminNotifs: CreateNotificationParams[] = admins.map((adm) => ({
        userId: adm.id,
        title: "Pengajuan Izin Siswa Baru",
        body: `${user.name} mengajukan izin ${data.leave_type} untuk ${inserted?.student_name || "Siswa"}.`,
        type: NotificationType.IZIN,
        referenceId: id,
      }));
      createNotifications(db, adminNotifs);
    }

    return c.json({ leave_request: inserted }, 201);
  };

  const reviewLeaveRequestHandler = async (c: any) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const rawBody = await c.req.json().catch(() => null);
    const parsed = ReviewLeaveRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format peninjauan izin tidak valid.",
          },
        },
        400
      );
    }

    const { status, review_notes } = parsed.data;

    const lr = db
      .query(
        `SELECT lr.*, s.class_id, s.full_name as student_name, c.homeroom_teacher_id
         FROM leave_requests lr
         JOIN students s ON lr.student_id = s.id
         JOIN classes c ON s.class_id = c.id
         WHERE lr.id = ?`
      )
      .get(id) as any | null;

    if (!lr) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Pengajuan izin tidak ditemukan.",
          },
        },
        404
      );
    }

    if (user.role === Role.TEACHER && lr.homeroom_teacher_id !== user.id) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda bukan wali kelas dari siswa ini.",
          },
        },
        403
      );
    }

    const runReview = db.transaction(() => {
      db.prepare(`
        UPDATE leave_requests
        SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
        WHERE id = ?
      `).run(status, user.id, review_notes || null, id);

      if (status === "APPROVED") {
        const upsertAtt = db.prepare(`
          INSERT INTO attendances (id, student_id, class_id, date, status, notes, recorded_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(student_id, date) DO UPDATE SET
            status = excluded.status,
            notes = excluded.notes,
            recorded_by = excluded.recorded_by
        `);

        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        const cur = new Date(start);

        while (cur <= end) {
          const dateStr = cur.toISOString().slice(0, 10);
          const attId = `att_${crypto.randomUUID().slice(0, 10)}`;
          upsertAtt.run(
            attId,
            lr.student_id,
            lr.class_id,
            dateStr,
            lr.leave_type,
            lr.reason,
            user.id
          );
          cur.setDate(cur.getDate() + 1);
        }
      }
    });

    runReview();

    createNotification(db, {
      userId: lr.guardian_id,
      title: status === "APPROVED" ? "Izin Disetujui" : "Izin Ditolak",
      body: `Pengajuan izin ${lr.leave_type} untuk ${lr.student_name} telah ${
        status === "APPROVED" ? "disetujui" : "ditolak"
      }${review_notes ? `: ${review_notes}` : "."}`,
      type: NotificationType.IZIN,
      referenceId: lr.id,
    });

    const updated = db
      .query(
        `SELECT lr.*, s.full_name as student_name, c.name as class_name, u.name as guardian_name
         FROM leave_requests lr
         JOIN students s ON lr.student_id = s.id
         JOIN classes c ON s.class_id = c.id
         JOIN users u ON lr.guardian_id = u.id
         WHERE lr.id = ?`
      )
      .get(id);

    return c.json({ leave_request: updated });
  };

  // Support both direct mount and sub-app path prefixes
  router.get("/", requireAuth(db), getLeaveRequestsHandler);
  router.get("/api/leave-requests", requireAuth(db), getLeaveRequestsHandler);

  router.post(
    "/",
    requireAuth(db),
    requireRole(Role.GUARDIAN),
    postLeaveRequestHandler
  );
  router.post(
    "/api/leave-requests",
    requireAuth(db),
    requireRole(Role.GUARDIAN),
    postLeaveRequestHandler
  );

  router.patch(
    "/:id/review",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    reviewLeaveRequestHandler
  );
  router.patch(
    "/api/leave-requests/:id/review",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    reviewLeaveRequestHandler
  );

  return router;
}
