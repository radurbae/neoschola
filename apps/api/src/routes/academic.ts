import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import {
  CreateAssignmentRequestSchema,
  CreateGradeNoteRequestSchema,
  NotificationType,
  Role,
} from "@neoschola/shared";
import type { AppEnv } from "../app";
import { requireAuth, requireRole, assertStudentAccess } from "../middleware/auth";
import { createNotifications, type CreateNotificationParams } from "../lib/notify";

export function createAcademicRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // 1. Schedules
  const getScheduleHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const classIdQuery = c.req.query("class_id");

    let resolvedClassId: string | null = null;

    if (studentId) {
      const access = assertStudentAccess(db, user, studentId);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: access.reason || "Anda tidak memiliki akses ke jadwal siswa ini.",
            },
          },
          403
        );
      }
      const student = db
        .query("SELECT class_id FROM students WHERE id = ?")
        .get(studentId) as { class_id: string } | null;
      if (!student) {
        return c.json(
          { error: { code: "NOT_FOUND", message: "Siswa tidak ditemukan." } },
          404
        );
      }
      resolvedClassId = student.class_id;
    } else if (classIdQuery) {
      if (user.role === Role.GUARDIAN) {
        const guardianHasStudentInClass = db
          .query(
            `SELECT 1 FROM guardian_students gs
             JOIN students s ON gs.student_id = s.id
             WHERE gs.guardian_id = ? AND s.class_id = ?`
          )
          .get(user.id, classIdQuery);
        if (!guardianHasStudentInClass) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Anda tidak memiliki anak di kelas ini.",
              },
            },
            403
          );
        }
      }
      resolvedClassId = classIdQuery;
    } else {
      if (user.role === Role.TEACHER) {
        const cls = db
          .query("SELECT id FROM classes WHERE homeroom_teacher_id = ?")
          .get(user.id) as { id: string } | null;
        if (cls) resolvedClassId = cls.id;
      }
    }

    if (!resolvedClassId) {
      return c.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter student_id atau class_id wajib disertakan.",
          },
        },
        400
      );
    }

    const schedules = db
      .query(
        `SELECT id, class_id, day_of_week, start_time, end_time, subject, teacher_name, room, created_at
         FROM schedules
         WHERE class_id = ?
         ORDER BY CASE day_of_week
           WHEN 'SENIN' THEN 1
           WHEN 'SELASA' THEN 2
           WHEN 'RABU' THEN 3
           WHEN 'KAMIS' THEN 4
           WHEN 'JUMAT' THEN 5
           WHEN 'SABTU' THEN 6
         END, start_time ASC`
      )
      .all(resolvedClassId);

    return c.json({ schedules });
  };

  // 2. Assignments (GET)
  const getAssignmentsHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const classIdQuery = c.req.query("class_id");

    let resolvedClassId: string | null = null;

    if (studentId) {
      const access = assertStudentAccess(db, user, studentId);
      if (!access.allowed) {
        return c.json(
          {
            error: {
              code: "FORBIDDEN",
              message: access.reason || "Anda tidak memiliki akses ke tugas siswa ini.",
            },
          },
          403
        );
      }
      const student = db
        .query("SELECT class_id FROM students WHERE id = ?")
        .get(studentId) as { class_id: string } | null;
      if (!student) {
        return c.json(
          { error: { code: "NOT_FOUND", message: "Siswa tidak ditemukan." } },
          404
        );
      }
      resolvedClassId = student.class_id;
    } else if (classIdQuery) {
      if (user.role === Role.GUARDIAN) {
        const guardianHasStudentInClass = db
          .query(
            `SELECT 1 FROM guardian_students gs
             JOIN students s ON gs.student_id = s.id
             WHERE gs.guardian_id = ? AND s.class_id = ?`
          )
          .get(user.id, classIdQuery);
        if (!guardianHasStudentInClass) {
          return c.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "Anda tidak memiliki anak di kelas ini.",
              },
            },
            403
          );
        }
      }
      resolvedClassId = classIdQuery;
    } else {
      if (user.role === Role.TEACHER) {
        const cls = db
          .query("SELECT id FROM classes WHERE homeroom_teacher_id = ?")
          .get(user.id) as { id: string } | null;
        if (cls) resolvedClassId = cls.id;
      }
    }

    if (!resolvedClassId) {
      return c.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter student_id atau class_id wajib disertakan.",
          },
        },
        400
      );
    }

    const assignments = db
      .query(
        `SELECT a.id, a.class_id, a.title, a.description, a.subject, a.due_date,
                a.assigned_by, a.created_at, u.name as assigned_by_name
         FROM assignments a
         LEFT JOIN users u ON a.assigned_by = u.id
         WHERE a.class_id = ?
         ORDER BY a.due_date DESC, a.created_at DESC`
      )
      .all(resolvedClassId);

    return c.json({ assignments });
  };

  // 3. Assignments (POST)
  const postAssignmentHandler = async (c: any) => {
    const user = c.get("user");
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateAssignmentRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format data tugas tidak valid.",
          },
        },
        400
      );
    }

    const { class_id, title, description, subject, due_date } = parsed.data;

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

    const id = `asg_${crypto.randomUUID().slice(0, 10)}`;

    db.prepare(`
      INSERT INTO assignments (id, class_id, title, description, subject, due_date, assigned_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, class_id, title, description, subject, due_date, user.id);

    const assignment = db
      .query(
        `SELECT a.id, a.class_id, a.title, a.description, a.subject, a.due_date,
                a.assigned_by, a.created_at, u.name as assigned_by_name
         FROM assignments a
         LEFT JOIN users u ON a.assigned_by = u.id
         WHERE a.id = ?`
      )
      .get(id);

    // Kirim notifikasi ke seluruh wali murid kelas ini
    const guardians = db
      .query(
        `SELECT DISTINCT gs.guardian_id
         FROM guardian_students gs
         JOIN students s ON gs.student_id = s.id
         WHERE s.class_id = ?`
      )
      .all(class_id) as { guardian_id: string }[];

    const notifs: CreateNotificationParams[] = guardians.map((g) => ({
      userId: g.guardian_id,
      title: `Tugas Baru: ${title}`,
      body: `Tugas baru mata pelajaran ${subject} telah diberikan. Batas pengumpulan: ${due_date}.`,
      type: NotificationType.AKADEMIK,
      referenceId: id,
    }));

    if (notifs.length > 0) {
      createNotifications(db, notifs);
    }

    return c.json({ assignment }, 201);
  };

  // 4. Grades (GET)
  const getGradesHandler = async (c: any) => {
    const user = c.get("user");
    const studentId = c.req.query("student_id");

    if (!studentId) {
      return c.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Parameter student_id wajib disertakan.",
          },
        },
        400
      );
    }

    const access = assertStudentAccess(db, user, studentId);
    if (!access.allowed) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: access.reason || "Anda tidak memiliki akses ke nilai siswa ini.",
          },
        },
        403
      );
    }

    const grades = db
      .query(
        `SELECT gn.id, gn.student_id, gn.subject, gn.semester, gn.academic_year,
                gn.score, gn.notes, gn.teacher_id, gn.created_at, u.name as teacher_name
         FROM grade_notes gn
         LEFT JOIN users u ON gn.teacher_id = u.id
         WHERE gn.student_id = ?
         ORDER BY gn.created_at DESC`
      )
      .all(studentId);

    return c.json({ grades });
  };

  // 5. Grades (POST)
  const postGradeHandler = async (c: any) => {
    const user = c.get("user");
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateGradeNoteRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format data nilai tidak valid.",
          },
        },
        400
      );
    }

    const { student_id, subject, semester, academic_year, score, notes } = parsed.data;

    const access = assertStudentAccess(db, user, student_id);
    if (!access.allowed) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: access.reason || "Anda tidak memiliki akses menginput nilai untuk siswa ini.",
          },
        },
        403
      );
    }

    const id = `grd_${crypto.randomUUID().slice(0, 10)}`;

    db.prepare(`
      INSERT INTO grade_notes (id, student_id, subject, semester, academic_year, score, notes, teacher_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      student_id,
      subject,
      semester,
      academic_year,
      score,
      notes || null,
      user.id
    );

    const grade_note = db
      .query(
        `SELECT gn.id, gn.student_id, gn.subject, gn.semester, gn.academic_year,
                gn.score, gn.notes, gn.teacher_id, gn.created_at, u.name as teacher_name
         FROM grade_notes gn
         LEFT JOIN users u ON gn.teacher_id = u.id
         WHERE gn.id = ?`
      )
      .get(id);

    // Kirim notifikasi ke wali murid siswa
    const guardians = db
      .query("SELECT guardian_id FROM guardian_students WHERE student_id = ?")
      .all(student_id) as { guardian_id: string }[];

    const student = db
      .query("SELECT full_name FROM students WHERE id = ?")
      .get(student_id) as { full_name: string } | null;

    const notifs: CreateNotificationParams[] = guardians.map((g) => ({
      userId: g.guardian_id,
      title: `Catatan Nilai Baru: ${subject}`,
      body: `Nilai ${subject} untuk ${student?.full_name || "Siswa"} telah dicatat: ${score}.`,
      type: NotificationType.AKADEMIK,
      referenceId: id,
    }));

    if (notifs.length > 0) {
      createNotifications(db, notifs);
    }

    return c.json({ grade_note }, 201);
  };

  // Support both direct mount and sub-app path prefixes
  router.get("/schedule", requireAuth(db), getScheduleHandler);
  router.get("/api/academic/schedule", requireAuth(db), getScheduleHandler);

  router.get("/assignments", requireAuth(db), getAssignmentsHandler);
  router.get("/api/academic/assignments", requireAuth(db), getAssignmentsHandler);

  router.post(
    "/assignments",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postAssignmentHandler
  );
  router.post(
    "/api/academic/assignments",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postAssignmentHandler
  );

  router.get("/grades", requireAuth(db), getGradesHandler);
  router.get("/api/academic/grades", requireAuth(db), getGradesHandler);

  router.post(
    "/grades",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postGradeHandler
  );
  router.post(
    "/api/academic/grades",
    requireAuth(db),
    requireRole(Role.TEACHER, Role.ADMIN),
    postGradeHandler
  );

  return router;
}
