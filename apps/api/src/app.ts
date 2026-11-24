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
import { createRateLimiter } from "./middleware/rateLimit";

export type AppEnv = {
  Variables: {
    user: User;
  };
};

export interface CreateAppOptions {
  nodeEnv?: string;
  corsOrigins?: string[];
  loginRateLimit?: { windowMs: number; max: number };
  writeRateLimit?: { windowMs: number; max: number };
}

export function createApp(db: Database, options: CreateAppOptions = {}) {
  const app = new Hono<AppEnv>();
  const isProd = (options.nodeEnv ?? process.env.NODE_ENV) === "production";
  const allowedOrigins =
    options.corsOrigins ??
    (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!isProd && allowedOrigins.length === 0) return "*";
        if (!origin) return "";
        return allowedOrigins.includes(origin) ? origin : "";
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  app.use("*", async (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
  });

  app.use(
    "/api/auth/login",
    createRateLimiter({
      keyPrefix: "login",
      methods: ["POST"],
      windowMs: options.loginRateLimit?.windowMs ?? 15 * 60_000,
      max: options.loginRateLimit?.max ?? 20,
    })
  );

  const writeLimiter = createRateLimiter({
    keyPrefix: "write",
    methods: ["POST", "PATCH", "PUT", "DELETE"],
    windowMs: options.writeRateLimit?.windowMs ?? 60_000,
    max: options.writeRateLimit?.max ?? 60,
  });

  app.use("/api/*", async (c, next) => {
    if (c.req.path === "/api/auth/login") {
      await next();
      return;
    }
    return writeLimiter(c, next);
  });

  app.onError((err, c) => {
    console.error("API Error:", err);
    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: isProd
            ? "Terjadi kesalahan internal pada server."
            : err.message || "Terjadi kesalahan internal pada server.",
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
