import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  Role,
  CreateThreadRequestSchema,
  SendMessageRequestSchema,
  NotificationType,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, assertStudentAccess } from "../middleware/auth";
import { createNotification } from "../lib/notify";

const SERVICE_HOURS = "Senin–Jumat, 07.00–15.00 WIB";

export function createMessageRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // 1. GET /api/threads
  router.get("/", requireAuth(db), (c) => {
    const user = c.get("user");

    const whereClauses: string[] = [];
    const params: any[] = [user.id]; // for unread_count query

    if (user.role === Role.GUARDIAN) {
      whereClauses.push("t.guardian_id = ?");
      params.push(user.id);
    } else if (user.role === Role.TEACHER) {
      whereClauses.push("t.teacher_id = ?");
      params.push(user.id);
    }
    // ADMIN: see all threads

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
      SELECT
        t.id,
        t.student_id,
        s.full_name AS student_name,
        t.guardian_id,
        ug.name AS guardian_name,
        t.teacher_id,
        ut.name AS teacher_name,
        t.subject,
        t.last_message_at,
        t.created_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.thread_id = t.id AND m.sender_id != ? AND m.is_read = 0
        ) AS unread_count,
        (
          SELECT m.content
          FROM messages m
          WHERE m.thread_id = t.id
          ORDER BY m.created_at DESC, m.rowid DESC
          LIMIT 1
        ) AS last_message
      FROM message_threads t
      JOIN students s ON t.student_id = s.id
      JOIN users ug ON t.guardian_id = ug.id
      JOIN users ut ON t.teacher_id = ut.id
      ${whereSQL}
      ORDER BY t.last_message_at DESC
    `;

    const threads = db.query(sql).all(...params);

    return c.json({
      threads,
      service_hours: SERVICE_HOURS,
    });
  });

  // 2. POST /api/threads
  router.post("/", requireAuth(db), async (c) => {
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

    const parseResult = CreateThreadRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.errors[0]?.message ||
              "Data pembuatan utas pesan tidak valid.",
          },
        },
        400
      );
    }

    const data = parseResult.data;

    let guardianId: string;
    if (user.role === Role.GUARDIAN) {
      const access = assertStudentAccess(db, user, data.student_id);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN_STUDENT_ACCESS",
              message:
                access.reason ||
                "Anda hanya diperkenankan mengakses informasi anak asuh Anda sendiri.",
            },
          },
          403
        );
      }
      guardianId = user.id;
    } else {
      // Guru / Admin menentukan guardian siswa
      const guardianRow = db
        .query(
          `SELECT guardian_id
           FROM guardian_students
           WHERE student_id = ?
           ORDER BY is_primary DESC
           LIMIT 1`
        )
        .get(data.student_id) as { guardian_id: string } | null;

      if (!guardianRow) {
        return c.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Wali murid untuk siswa ini tidak ditemukan.",
            },
          },
          404
        );
      }
      guardianId = guardianRow.guardian_id;
    }

    // Pastikan guru ada
    const teacher = db
      .query("SELECT id, name FROM users WHERE id = ? AND role = 'TEACHER'")
      .get(data.teacher_id) as { id: string; name: string } | null;

    if (!teacher) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Guru yang dituju tidak ditemukan.",
          },
        },
        404
      );
    }

    // Cek apakah sudah ada thread dengan kombinasi ini
    let thread = db
      .query(
        `SELECT id FROM message_threads
         WHERE student_id = ? AND guardian_id = ? AND teacher_id = ? AND subject = ?`
      )
      .get(
        data.student_id,
        guardianId,
        data.teacher_id,
        data.subject
      ) as { id: string } | null;

    let threadId: string;
    if (thread) {
      threadId = thread.id;
      db.run(
        "UPDATE message_threads SET last_message_at = datetime('now') WHERE id = ?",
        [threadId]
      );
    } else {
      threadId = `th_${crypto.randomUUID().slice(0, 12)}`;
      db.run(
        `INSERT INTO message_threads (id, student_id, guardian_id, teacher_id, subject, last_message_at, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [threadId, data.student_id, guardianId, data.teacher_id, data.subject]
      );
    }

    // Simpan pesan awal
    const messageId = `msg_${crypto.randomUUID().slice(0, 12)}`;
    db.run(
      `INSERT INTO messages (id, thread_id, sender_id, content, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      [messageId, threadId, user.id, data.initial_message]
    );

    // Kirim notifikasi ke lawan bicara
    const recipientId = user.id === guardianId ? data.teacher_id : guardianId;
    createNotification(db, {
      userId: recipientId,
      title: `Pesan baru dari ${user.name}`,
      body: data.initial_message.slice(0, 100),
      type: NotificationType.PESAN,
      referenceId: threadId,
    });

    const enrichedThread = db
      .query(
        `SELECT
          t.id,
          t.student_id,
          s.full_name AS student_name,
          t.guardian_id,
          ug.name AS guardian_name,
          t.teacher_id,
          ut.name AS teacher_name,
          t.subject,
          t.last_message_at,
          t.created_at
        FROM message_threads t
        JOIN students s ON t.student_id = s.id
        JOIN users ug ON t.guardian_id = ug.id
        JOIN users ut ON t.teacher_id = ut.id
        WHERE t.id = ?`
      )
      .get(threadId);

    return c.json({ thread: enrichedThread }, 201);
  });

  // 3. GET /api/threads/:id/messages
  router.get("/:id/messages", requireAuth(db), (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const thread = db
      .query("SELECT * FROM message_threads WHERE id = ?")
      .get(id) as any;

    if (!thread) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Utas pesan tidak ditemukan.",
          },
        },
        404
      );
    }

    // Cek kepemilikan/peserta thread
    if (
      thread.guardian_id !== user.id &&
      thread.teacher_id !== user.id &&
      user.role !== Role.ADMIN
    ) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda bukan peserta dalam utas percakapan ini.",
          },
        },
        403
      );
    }

    const enrichedThread = db
      .query(
        `SELECT
          t.id,
          t.student_id,
          s.full_name AS student_name,
          t.guardian_id,
          ug.name AS guardian_name,
          t.teacher_id,
          ut.name AS teacher_name,
          t.subject,
          t.last_message_at,
          t.created_at
        FROM message_threads t
        JOIN students s ON t.student_id = s.id
        JOIN users ug ON t.guardian_id = ug.id
        JOIN users ut ON t.teacher_id = ut.id
        WHERE t.id = ?`
      )
      .get(id);

    const messageRows = db
      .query(
        `SELECT
          m.id,
          m.thread_id,
          m.sender_id,
          u.name AS sender_name,
          m.content,
          (m.is_read = 1) AS is_read,
          m.created_at
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.thread_id = ?
        ORDER BY m.created_at ASC, m.rowid ASC`
      )
      .all(id) as any[];

    const messages = messageRows.map((m) => ({
      ...m,
      is_read: Boolean(m.is_read),
    }));

    return c.json({
      thread: enrichedThread,
      messages,
      service_hours: SERVICE_HOURS,
    });
  });

  // 4. POST /api/threads/:id/messages
  router.post("/:id/messages", requireAuth(db), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const thread = db
      .query("SELECT * FROM message_threads WHERE id = ?")
      .get(id) as any;

    if (!thread) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Utas pesan tidak ditemukan.",
          },
        },
        404
      );
    }

    if (
      thread.guardian_id !== user.id &&
      thread.teacher_id !== user.id &&
      user.role !== Role.ADMIN
    ) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda bukan peserta dalam utas percakapan ini.",
          },
        },
        403
      );
    }

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

    const parseResult = SendMessageRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.errors[0]?.message ||
              "Isi pesan tidak valid atau kosong.",
          },
        },
        400
      );
    }

    const data = parseResult.data;
    const messageId = `msg_${crypto.randomUUID().slice(0, 12)}`;

    db.run(
      `INSERT INTO messages (id, thread_id, sender_id, content, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      [messageId, id, user.id, data.content]
    );

    db.run(
      "UPDATE message_threads SET last_message_at = datetime('now') WHERE id = ?",
      [id]
    );

    // Kirim notifikasi ke lawan bicara
    const recipientId =
      user.id === thread.guardian_id ? thread.teacher_id : thread.guardian_id;

    createNotification(db, {
      userId: recipientId,
      title: `Pesan baru dari ${user.name}`,
      body: data.content.slice(0, 100),
      type: NotificationType.PESAN,
      referenceId: id,
    });

    const message = db
      .query(
        `SELECT
          m.id,
          m.thread_id,
          m.sender_id,
          u.name AS sender_name,
          m.content,
          (m.is_read = 1) AS is_read,
          m.created_at
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?`
      )
      .get(messageId) as any;

    return c.json(
      {
        message: {
          ...message,
          is_read: Boolean(message.is_read),
        },
      },
      201
    );
  });

  // 5. POST /api/threads/:id/read
  router.post("/:id/read", requireAuth(db), (c) => {
    const user = c.get("user");
    const id = c.req.param("id") as string;

    const thread = db
      .query("SELECT * FROM message_threads WHERE id = ?")
      .get(id) as any;

    if (!thread) {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Utas pesan tidak ditemukan.",
          },
        },
        404
      );
    }

    if (
      thread.guardian_id !== user.id &&
      thread.teacher_id !== user.id &&
      user.role !== Role.ADMIN
    ) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Anda bukan peserta dalam utas percakapan ini.",
          },
        },
        403
      );
    }

    db.run(
      "UPDATE messages SET is_read = 1 WHERE thread_id = ? AND sender_id != ?",
      [id, user.id]
    );

    return c.json({ success: true });
  });

  return router;
}
