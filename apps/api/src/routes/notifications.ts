import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import type { AppEnv } from "../app";
import { requireAuth } from "../middleware/auth";

export function createNotificationRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // 1. GET /api/notifications
  router.get("/", requireAuth(db), (c) => {
    const user = c.get("user");

    const sql = `
      SELECT
        id,
        user_id,
        title,
        body,
        type,
        reference_id,
        (is_read = 1) AS is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const rows = db.query(sql).all(user.id) as any[];
    const notifications = rows.map((r) => ({
      ...r,
      is_read: Boolean(r.is_read),
    }));

    const unreadRow = db
      .query(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0"
      )
      .get(user.id) as { count: number };

    return c.json({
      notifications,
      unread_count: unreadRow.count,
    });
  });

  // 2. PATCH /api/notifications/:id/read
  router.patch("/:id/read", requireAuth(db), (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const notif = db
      .query("SELECT * FROM notifications WHERE id = ?")
      .get(id) as any;

    if (!notif) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Notifikasi tidak ditemukan.",
          },
        },
        404
      );
    }

    if (notif.user_id !== user.id) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke notifikasi ini.",
          },
        },
        403
      );
    }

    db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);

    return c.json({ success: true });
  });

  // 3. POST /api/notifications/read-all
  router.post("/read-all", requireAuth(db), (c) => {
    const user = c.get("user");

    const unreadRow = db
      .query(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0"
      )
      .get(user.id) as { count: number };

    db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [
      user.id,
    ]);

    return c.json({
      success: true,
      updated_count: unreadRow.count,
    });
  });

  return router;
}
