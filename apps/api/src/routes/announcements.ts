import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  Role,
  CreateAnnouncementRequestSchema,
  NotificationType,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, requireRole } from "../middleware/auth";
import { createNotifications } from "../lib/notify";

export function createAnnouncementRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // 1. GET /api/announcements
  router.get("/", requireAuth(db), (c) => {
    const user = c.get("user");
    const classIdParam = c.req.query("class_id");
    const categoryParam = c.req.query("category");

    const whereClauses: string[] = [];
    const params: any[] = [user.id]; // for announcement_reads join

    if (user.role === Role.GUARDIAN) {
      whereClauses.push(
        "a.target_role IN ('ALL', 'GUARDIAN') AND (a.class_id IS NULL OR a.class_id IN (SELECT s.class_id FROM students s JOIN guardian_students gs ON s.id = gs.student_id WHERE gs.guardian_id = ?))"
      );
      params.push(user.id);
    } else if (user.role === Role.TEACHER) {
      whereClauses.push(
        "a.target_role IN ('ALL', 'TEACHER') AND (a.class_id IS NULL OR a.class_id IN (SELECT id FROM classes WHERE homeroom_teacher_id = ?))"
      );
      params.push(user.id);
    }
    // ADMIN sees all target_roles

    if (classIdParam) {
      whereClauses.push("a.class_id = ?");
      params.push(classIdParam);
    }

    if (categoryParam) {
      whereClauses.push("a.category = ?");
      params.push(categoryParam);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
      SELECT
        a.id,
        a.title,
        a.content,
        a.category,
        a.target_role,
        a.class_id,
        c.name AS class_name,
        (a.is_pinned = 1) AS is_pinned,
        a.created_by,
        u.name AS created_by_name,
        a.created_at,
        (ar.id IS NOT NULL) AS is_read
      FROM announcements a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
      ${whereSQL}
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `;

    const rows = db.query(sql).all(...params) as any[];

    const announcements = rows.map((row) => ({
      ...row,
      is_pinned: Boolean(row.is_pinned),
      is_read: Boolean(row.is_read),
    }));

    return c.json({ announcements });
  });

  // 2. POST /api/announcements
  router.post(
    "/",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    async (c) => {
      const user = c.get("user");
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "Format JSON tidak valid.",
            },
          },
          400
        );
      }

      const parseResult = CreateAnnouncementRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message:
                parseResult.error.errors[0]?.message ||
                "Data pengumuman tidak valid.",
            },
          },
          400
        );
      }

      const data = parseResult.data;

      // Restriksi Peran TEACHER
      if (user.role === Role.TEACHER) {
        if (data.category === "DARURAT" && !data.class_id) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN",
                message:
                  "Guru tidak diizinkan mempublikasikan pengumuman darurat global sekolah.",
              },
            },
            403
          );
        }

        if (data.class_id) {
          const classRow = db
            .query(
              "SELECT 1 FROM classes WHERE id = ? AND homeroom_teacher_id = ?"
            )
            .get(data.class_id, user.id);
          if (!classRow) {
            return c.json(
              {
                error: {
                  code: "FORBIDDEN",
                  message:
                    "Anda hanya dapat membuat pengumuman untuk rombongan belajar kelas binaan Anda.",
                },
              },
              403
            );
          }
        }
      }

      const announcementId = `anc_${crypto.randomUUID().slice(0, 12)}`;
      const stmt = db.prepare(`
        INSERT INTO announcements (id, title, content, category, target_role, class_id, is_pinned, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        announcementId,
        data.title,
        data.content,
        data.category,
        data.target_role,
        data.class_id ?? null,
        data.is_pinned ? 1 : 0,
        user.id
      );

      // Notifikasi ke wali murid relevan
      let targetGuardians: { user_id: string }[] = [];
      if (data.class_id) {
        targetGuardians = db
          .query(
            `SELECT DISTINCT gs.guardian_id AS user_id
             FROM guardian_students gs
             JOIN students s ON gs.student_id = s.id
             WHERE s.class_id = ?`
          )
          .all(data.class_id) as { user_id: string }[];
      } else if (data.target_role === "ALL" || data.target_role === "GUARDIAN") {
        targetGuardians = db
          .query("SELECT id AS user_id FROM users WHERE role = 'GUARDIAN'")
          .all() as { user_id: string }[];
      }

      if (targetGuardians.length > 0) {
        createNotifications(
          db,
          targetGuardians.map((g) => ({
            userId: g.user_id,
            title: `Pengumuman: ${data.title}`,
            body: data.content.slice(0, 100),
            type: NotificationType.PENGUMUMAN,
            referenceId: announcementId,
          }))
        );
      }

      const created = db
        .query(
          `SELECT
            a.id,
            a.title,
            a.content,
            a.category,
            a.target_role,
            a.class_id,
            c.name AS class_name,
            (a.is_pinned = 1) AS is_pinned,
            a.created_by,
            u.name AS created_by_name,
            a.created_at
          FROM announcements a
          LEFT JOIN classes c ON a.class_id = c.id
          LEFT JOIN users u ON a.created_by = u.id
          WHERE a.id = ?`
        )
        .get(announcementId) as any;

      return c.json(
        {
          announcement: {
            ...created,
            is_pinned: Boolean(created.is_pinned),
          },
        },
        201
      );
    }
  );

  // 3. POST /api/announcements/:id/ack
  router.post("/:id/ack", requireAuth(db), (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const announcement = db
      .query("SELECT * FROM announcements WHERE id = ?")
      .get(id) as any;

    if (!announcement) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Pengumuman tidak ditemukan.",
          },
        },
        404
      );
    }

    // Akses check berdasarkan peran
    if (user.role === Role.GUARDIAN) {
      if (
        announcement.target_role !== "ALL" &&
        announcement.target_role !== "GUARDIAN"
      ) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Anda tidak memiliki akses ke pengumuman ini.",
            },
          },
          403
        );
      }

      if (announcement.class_id) {
        const studentRow = db
          .query(
            `SELECT 1 FROM guardian_students gs
             JOIN students s ON gs.student_id = s.id
             WHERE gs.guardian_id = ? AND s.class_id = ?`
          )
          .get(user.id, announcement.class_id);

        if (!studentRow) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Anda tidak memiliki akses ke pengumuman kelas ini.",
              },
            },
            403
          );
        }
      }
    } else if (user.role === Role.TEACHER) {
      if (
        announcement.target_role !== "ALL" &&
        announcement.target_role !== "TEACHER"
      ) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Anda tidak memiliki akses ke pengumuman ini.",
            },
          },
          403
        );
      }

      if (announcement.class_id) {
        const classRow = db
          .query(
            "SELECT 1 FROM classes WHERE id = ? AND homeroom_teacher_id = ?"
          )
          .get(announcement.class_id, user.id);

        if (!classRow) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Anda tidak memiliki akses ke pengumuman kelas ini.",
              },
            },
            403
          );
        }
      }
    }

    const arId = `ar_${crypto.randomUUID().slice(0, 12)}`;
    db.run(
      `INSERT INTO announcement_reads (id, announcement_id, user_id, read_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at = datetime('now')`,
      [arId, id, user.id]
    );

    const readRow = db
      .query(
        "SELECT read_at FROM announcement_reads WHERE announcement_id = ? AND user_id = ?"
      )
      .get(id, user.id) as { read_at: string };

    return c.json({ success: true, read_at: readRow.read_at });
  });

  return router;
}
