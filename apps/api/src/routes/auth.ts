import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { LoginRequestSchema, Role } from "@neoschola/shared";
import type { AppEnv } from "../app";
import { verifyPassword, signJwt } from "../lib/auth";
import { requireAuth } from "../middleware/auth";

export function createAuthRoutes(db: Database): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  const loginHandler = async (c: any) => {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = LoginRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Format data login tidak valid.",
          },
        },
        400
      );
    }

    const { email, password } = parsed.data;

    const user = db
      .query(
        `SELECT id, email, password_hash, password_salt, name, role, phone, avatar_url, created_at, updated_at
         FROM users
         WHERE email = ?`
      )
      .get(email) as {
      id: string;
      email: string;
      password_hash: string;
      password_salt: string;
      name: string;
      role: Role;
      phone: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
    } | null;

    if (!user) {
      return c.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email atau kata sandi tidak cocok.",
          },
        },
        401
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!isMatch) {
      return c.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email atau kata sandi tidak cocok.",
          },
        },
        401
      );
    }

    const token = await signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      avatar_url: user.avatar_url ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return c.json({
      token,
      user: userProfile,
    });
  };

  const meHandler = async (c: any) => {
    const user = c.get("user");

    if (user.role === Role.GUARDIAN) {
      const studentRows = db
        .query(
          `SELECT s.id, s.nis, s.nisn, s.full_name, s.nickname, s.class_id, c.name as class_name,
                  s.gender, s.birth_date, s.is_active, s.created_at
           FROM students s
           JOIN guardian_students gs ON s.id = gs.student_id
           LEFT JOIN classes c ON s.class_id = c.id
           WHERE gs.guardian_id = ?
           ORDER BY s.full_name ASC`
        )
        .all(user.id) as any[];

      const students = studentRows.map((s) => ({
        ...s,
        is_active: Boolean(s.is_active),
      }));

      return c.json({
        user,
        students,
      });
    }

    if (user.role === Role.TEACHER) {
      const classes = db
        .query(
          `SELECT id, name, grade_level, academic_year, homeroom_teacher_id, created_at
           FROM classes
           WHERE homeroom_teacher_id = ?
           ORDER BY grade_level ASC, name ASC`
        )
        .all(user.id);

      return c.json({
        user,
        classes,
      });
    }

    if (user.role === Role.ADMIN) {
      const classes = db
        .query(
          `SELECT id, name, grade_level, academic_year, homeroom_teacher_id, created_at
           FROM classes
           ORDER BY grade_level ASC, name ASC`
        )
        .all();

      return c.json({
        user,
        classes,
      });
    }

    return c.json({ user });
  };

  // Support both direct mount and sub-app path prefixes
  router.post("/login", loginHandler);
  router.post("/api/auth/login", loginHandler);

  router.get("/me", requireAuth(db), meHandler);
  router.get("/api/auth/me", requireAuth(db), meHandler);

  return router;
}
