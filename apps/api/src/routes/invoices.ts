import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  Role,
  CreateInvoiceRequestSchema,
  SubmitPaymentRequestSchema,
  VerifyInvoiceRequestSchema,
  InvoiceStatus,
  NotificationType,
  formatRupiah,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, requireRole, assertStudentAccess } from "../middleware/auth";
import { createNotifications } from "../lib/notify";

export function createInvoiceRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // 1. GET /api/invoices
  router.get("/", requireAuth(db), (c) => {
    const user = c.get("user");

    // Isolasi ketat: Guru tidak diperkenankan mengakses informasi keuangan
    if (user.role === Role.TEACHER) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Guru tidak memiliki izin untuk mengakses data tagihan dan keuangan.",
          },
        },
        403
      );
    }

    const studentIdParam = c.req.query("student_id");
    const statusParam = c.req.query("status");

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (user.role === Role.GUARDIAN) {
      if (studentIdParam) {
        const access = assertStudentAccess(db, user, studentIdParam);
        if (!access.allowed) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN_STUDENT_ACCESS",
                message:
                  access.reason ||
                  "Anda hanya dapat melihat tagihan anak asuh Anda sendiri.",
              },
            },
            403
          );
        }
        whereClauses.push("i.student_id = ?");
        params.push(studentIdParam);
      } else {
        whereClauses.push(
          "i.student_id IN (SELECT student_id FROM guardian_students WHERE guardian_id = ?)"
        );
        params.push(user.id);
      }
    } else if (user.role === Role.ADMIN) {
      if (studentIdParam) {
        whereClauses.push("i.student_id = ?");
        params.push(studentIdParam);
      }
    }

    if (statusParam) {
      whereClauses.push("i.status = ?");
      params.push(statusParam);
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `
      SELECT
        i.id,
        i.student_id,
        s.full_name AS student_name,
        c.name AS class_name,
        i.title,
        i.description,
        i.amount,
        i.due_date,
        i.status,
        i.payment_method,
        i.payment_ref,
        i.proof_note,
        i.payment_proof_url,
        i.receipt_no,
        i.paid_at,
        i.verified_by,
        i.verified_at,
        i.created_at
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      ${whereSQL}
      ORDER BY i.created_at DESC
    `;

    const invoices = db.query(sql).all(...params);

    return c.json({ invoices });
  });

  // 2. POST /api/invoices
  router.post("/", requireAuth(db), requireRole(Role.ADMIN), async (c) => {
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

    const parseResult = CreateInvoiceRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parseResult.error.errors[0]?.message ||
              "Data pembuatan tagihan tidak valid.",
          },
        },
        400
      );
    }

    const data = parseResult.data;

    const student = db
      .query("SELECT id, full_name FROM students WHERE id = ?")
      .get(data.student_id) as { id: string; full_name: string } | null;

    if (!student) {
      return c.json(
        {
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Peserta didik tidak ditemukan.",
          },
        },
        404
      );
    }

    const invoiceId = `inv_${crypto.randomUUID().slice(0, 12)}`;
    db.run(
      `INSERT INTO invoices (id, student_id, title, description, amount, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'UNPAID', datetime('now'))`,
      [
        invoiceId,
        data.student_id,
        data.title,
        data.description ?? null,
        data.amount,
        data.due_date,
      ]
    );

    // Kirim notifikasi ke seluruh wali siswa tersebut
    const guardians = db
      .query(
        "SELECT guardian_id FROM guardian_students WHERE student_id = ?"
      )
      .all(data.student_id) as { guardian_id: string }[];

    if (guardians.length > 0) {
      createNotifications(
        db,
        guardians.map((g) => ({
          userId: g.guardian_id,
          title: `Tagihan Baru: ${data.title}`,
          body: `Tagihan ${data.title} sebesar ${formatRupiah(data.amount)} untuk ${student.full_name} telah diterbitkan. Batas pembayaran: ${data.due_date}.`,
          type: NotificationType.TAGIHAN,
          referenceId: invoiceId,
        }))
      );
    }

    const invoice = db
      .query(
        `SELECT
          i.id,
          i.student_id,
          s.full_name AS student_name,
          c.name AS class_name,
          i.title,
          i.description,
          i.amount,
          i.due_date,
          i.status,
          i.payment_method,
          i.payment_ref,
          i.proof_note,
          i.payment_proof_url,
          i.receipt_no,
          i.paid_at,
          i.verified_by,
          i.verified_at,
          i.created_at
        FROM invoices i
        JOIN students s ON i.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE i.id = ?`
      )
      .get(invoiceId);

    return c.json({ invoice }, 201);
  });

  // 3. POST /api/invoices/:id/submit-payment
  router.post(
    "/:id/submit-payment",
    requireAuth(db),
    requireRole(Role.GUARDIAN),
    async (c) => {
      const user = c.get("user");
      const id = c.req.param("id") as string;

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

      const parseResult = SubmitPaymentRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message:
                parseResult.error.errors[0]?.message ||
                "Bukti atau referensi pembayaran wajib diisi.",
            },
          },
          400
        );
      }

      const invoice = db
        .query("SELECT * FROM invoices WHERE id = ?")
        .get(id) as any;

      if (!invoice) {
        return c.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Tagihan tidak ditemukan.",
            },
          },
          404
        );
      }

      // Cek apakah siswa milik wali ini
      const access = assertStudentAccess(db, user, invoice.student_id);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN_STUDENT_ACCESS",
              message:
                access.reason ||
                "Anda hanya diperkenankan membayar tagihan anak asuh Anda sendiri.",
            },
          },
          403
        );
      }

      if (invoice.status === InvoiceStatus.PAID) {
        return c.json(
          {
            error: {
              code: "ALREADY_PAID",
              message: "Tagihan ini telah berstatus lunas.",
            },
          },
          400
        );
      }

      const data = parseResult.data;

      db.run(
        `UPDATE invoices
         SET status = 'WAITING_VERIFICATION',
             payment_method = ?,
             payment_ref = ?,
             proof_note = ?,
             payment_proof_url = ?,
             paid_at = datetime('now')
         WHERE id = ?`,
        [
          data.payment_method ?? null,
          data.payment_ref ?? null,
          data.proof_note ?? null,
          data.payment_proof_url ?? null,
          id,
        ]
      );

      // Notifikasi ke seluruh ADMIN
      const admins = db
        .query("SELECT id FROM users WHERE role = 'ADMIN'")
        .all() as { id: string }[];

      if (admins.length > 0) {
        createNotifications(
          db,
          admins.map((adm) => ({
            userId: adm.id,
            title: `Konfirmasi Pembayaran: ${invoice.title}`,
            body: `${user.name} telah mengirimkan konfirmasi pembayaran untuk tagihan ${invoice.title}.`,
            type: NotificationType.TAGIHAN,
            referenceId: invoice.id,
          }))
        );
      }

      const updated = db
        .query(
          `SELECT
            i.id,
            i.student_id,
            s.full_name AS student_name,
            c.name AS class_name,
            i.title,
            i.description,
            i.amount,
            i.due_date,
            i.status,
            i.payment_method,
            i.payment_ref,
            i.proof_note,
            i.payment_proof_url,
            i.receipt_no,
            i.paid_at,
            i.verified_by,
            i.verified_at,
            i.created_at
          FROM invoices i
          JOIN students s ON i.student_id = s.id
          JOIN classes c ON s.class_id = c.id
          WHERE i.id = ?`
        )
        .get(id);

      return c.json({ invoice: updated });
    }
  );

  // 4. PATCH /api/invoices/:id/verify
  router.patch(
    "/:id/verify",
    requireAuth(db),
    requireRole(Role.ADMIN),
    async (c) => {
      const user = c.get("user");
      const id = c.req.param("id") as string;

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

      const parseResult = VerifyInvoiceRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message:
                parseResult.error.errors[0]?.message ||
                "Data verifikasi tagihan tidak valid.",
            },
          },
          400
        );
      }

      const invoice = db
        .query("SELECT * FROM invoices WHERE id = ?")
        .get(id) as any;

      if (!invoice) {
        return c.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Tagihan tidak ditemukan.",
            },
          },
          404
        );
      }

      const data = parseResult.data;
      const guardians = db
        .query(
          "SELECT guardian_id FROM guardian_students WHERE student_id = ?"
        )
        .all(invoice.student_id) as { guardian_id: string }[];

      if (data.status === "PAID") {
        const date = new Date();
        const ym = `${date.getFullYear()}${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        const countRow = db
          .query(
            "SELECT COUNT(*) as count FROM invoices WHERE receipt_no LIKE ?"
          )
          .get(`KW-${ym}-%`) as { count: number };

        const seq = String(countRow.count + 1).padStart(4, "0");
        const receiptNo = `KW-${ym}-${seq}`;

        db.run(
          `UPDATE invoices
           SET status = 'PAID',
               receipt_no = ?,
               verified_by = ?,
               verified_at = datetime('now')
           WHERE id = ?`,
          [receiptNo, user.id, id]
        );

        if (guardians.length > 0) {
          createNotifications(
            db,
            guardians.map((g) => ({
              userId: g.guardian_id,
              title: `Pembayaran Terverifikasi: ${invoice.title}`,
              body: `Pembayaran tagihan Anda telah diverifikasi dengan nomor kuitansi ${receiptNo}.${data.notes ? ` Catatan: ${data.notes}` : ""}`,
              type: NotificationType.TAGIHAN,
              referenceId: invoice.id,
            }))
          );
        }
      } else {
        // REJECTED
        db.run(
          `UPDATE invoices
           SET status = 'REJECTED',
               verified_by = ?,
               verified_at = datetime('now')
           WHERE id = ?`,
          [user.id, id]
        );

        if (guardians.length > 0) {
          createNotifications(
            db,
            guardians.map((g) => ({
              userId: g.guardian_id,
              title: `Pembayaran Ditolak: ${invoice.title}`,
              body: `Bukti konfirmasi pembayaran untuk ${invoice.title} ditolak.${data.notes ? ` Catatan: ${data.notes}` : " Mohon unggah ulang bukti yang valid."}`,
              type: NotificationType.TAGIHAN,
              referenceId: invoice.id,
            }))
          );
        }
      }

      const updated = db
        .query(
          `SELECT
            i.id,
            i.student_id,
            s.full_name AS student_name,
            c.name AS class_name,
            i.title,
            i.description,
            i.amount,
            i.due_date,
            i.status,
            i.payment_method,
            i.payment_ref,
            i.proof_note,
            i.payment_proof_url,
            i.receipt_no,
            i.paid_at,
            i.verified_by,
            i.verified_at,
            i.created_at
          FROM invoices i
          JOIN students s ON i.student_id = s.id
          JOIN classes c ON s.class_id = c.id
          WHERE i.id = ?`
        )
        .get(id);

      return c.json({ invoice: updated });
    }
  );

  return router;
}
