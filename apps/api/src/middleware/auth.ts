import type { Context, Next } from "hono";
import type { Database } from "bun:sqlite";
import { verifyJwt } from "../lib/auth";
import { Role, type User } from "@neoschola/shared";

export type AuthContext = Context<{
  Variables: {
    user: User;
  };
}>;

export function requireAuth(db: Database) {
  return async (c: AuthContext, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Sesi tidak valid atau token otorisasi tidak ditemukan.",
          },
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyJwt<{ sub: string; email: string; role: Role }>(token);

    if (!payload || !payload.sub) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Token otentikasi telah kadaluarsa atau tidak valid.",
          },
        },
        401
      );
    }

    const user = db
      .query(
        "SELECT id, email, name, role, phone, avatar_url, created_at, updated_at FROM users WHERE id = ?"
      )
      .get(payload.sub) as User | null;

    if (!user) {
      return c.json(
        {
          error: {
            code: "USER_NOT_FOUND",
            message: "Pengguna dengan akun ini tidak lagi terdaftar.",
          },
        },
        401
      );
    }

    c.set("user", user);
    await next();
  };
}

export function requireRole(...roles: Role[]) {
  return async (c: AuthContext, next: Next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN_ROLE",
            message: "Anda tidak memiliki hak akses untuk tindakan ini.",
          },
        },
        403
      );
    }
    await next();
  };
}

export function assertStudentAccess(
  db: Database,
  user: User,
  studentId: string
): { allowed: boolean; reason?: string } {
  if (user.role === Role.ADMIN) {
    return { allowed: true };
  }

  if (user.role === Role.GUARDIAN) {
    const row = db
      .query(
        "SELECT 1 FROM guardian_students WHERE guardian_id = ? AND student_id = ?"
      )
      .get(user.id, studentId);
    if (!row) {
      return {
        allowed: false,
        reason: "Anda hanya diperkenankan mengakses informasi anak asuh Anda sendiri.",
      };
    }
    return { allowed: true };
  }

  if (user.role === Role.TEACHER) {
    const student = db
      .query("SELECT class_id FROM students WHERE id = ?")
      .get(studentId) as { class_id: string } | null;

    if (!student) {
      return { allowed: false, reason: "Siswa tidak ditemukan." };
    }

    const classRow = db
      .query("SELECT 1 FROM classes WHERE id = ? AND homeroom_teacher_id = ?")
      .get(student.class_id, user.id);

    if (!classRow) {
      return {
        allowed: false,
        reason: "Anda hanya memiliki akses untuk siswa di rombongan belajar kelas binaan Anda.",
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Peran pengguna tidak dikenali." };
}
