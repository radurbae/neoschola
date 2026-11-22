import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Database } from "bun:sqlite";
import type { User } from "@neoschola/shared";
import { createAuthRoutes } from "./routes/auth";
import { createStudentRoutes } from "./routes/students";
import { createAttendanceRoutes } from "./routes/attendance";
import { createLeaveRequestRoutes } from "./routes/leaveRequests";
import { createAcademicRoutes } from "./routes/academic";
import { createAnnouncementRoutes } from "./routes/announcements";
import { createMessageRoutes } from "./routes/messages";
import { createInvoiceRoutes } from "./routes/invoices";
import { createNotificationRoutes } from "./routes/notifications";

export type AppEnv = {
  Variables: {
    user: User;
  };
};

export function createApp(db: Database) {
  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  app.onError((err, c) => {
    console.error("API Error:", err);
    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Terjadi kesalahan internal pada server.",
        },
      },
      500
    );
  });

  app.get("/health", (c) => {
    return c.json({ ok: true, service: "neoschola-api" });
  });

  app.route("/api/auth", createAuthRoutes(db));
  app.route("/api/students", createStudentRoutes(db));
  app.route("/api/attendance", createAttendanceRoutes(db));
  app.route("/api/leave-requests", createLeaveRequestRoutes(db));
  app.route("/api/academic", createAcademicRoutes(db));
  app.route("/api/announcements", createAnnouncementRoutes(db));
  app.route("/api/threads", createMessageRoutes(db));
  app.route("/api/invoices", createInvoiceRoutes(db));
  app.route("/api/notifications", createNotificationRoutes(db));

  return app;
}
