import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Database } from "bun:sqlite";
import type { User } from "@neoschola/shared";

export type AppEnv = {
  Variables: {
    user: User;
  };
};

export function createApp(_db: Database) {
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

  return app;
}
