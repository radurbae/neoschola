import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { unlinkSync } from "node:fs";
import { getJwtSecret, assertProductionSecurityConfig } from "../src/lib/auth";
import { createApp } from "../src/app";
import { resetDemoDatabase } from "../src/db/resetDemo";

describe("API Hardening & Security Config", () => {
  it("getJwtSecret: memverifikasi validasi secret di dev dan production", () => {
    // Non-production fallback
    expect(getJwtSecret({ NODE_ENV: "development" })).toBe(
      "neoschola-demo-jwt-secret-2026-key"
    );

    // Production tanpa JWT_SECRET wajib throw
    expect(() =>
      getJwtSecret({ NODE_ENV: "production", JWT_SECRET: "" })
    ).toThrow("JWT_SECRET wajib disetel saat NODE_ENV=production.");

    // Production dengan secret < 32 karakter wajib throw
    expect(() =>
      getJwtSecret({
        NODE_ENV: "production",
        JWT_SECRET: "kunci-terlalu-pendek",
      })
    ).toThrow("JWT_SECRET di production minimal 32 karakter.");

    // Production dengan secret >= 32 karakter berhasil
    const validSecret = "1234567890123456789012345678901234";
    expect(
      getJwtSecret({ NODE_ENV: "production", JWT_SECRET: validSecret })
    ).toBe(validSecret);

    expect(() =>
      assertProductionSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: validSecret,
      })
    ).not.toThrow();
  });

  it("CORS: membatasi origin di production dan mengizinkan origin terdaftar", async () => {
    const memDb = new Database(":memory:");
    const app = createApp(memDb, {
      nodeEnv: "production",
      corsOrigins: ["https://demo.neoschola.id"],
    });

    // Allowed origin
    const resAllowed = await app.request("/health", {
      headers: { Origin: "https://demo.neoschola.id" },
    });
    expect(resAllowed.headers.get("access-control-allow-origin")).toBe(
      "https://demo.neoschola.id"
    );

    // Denied origin
    const resDenied = await app.request("/health", {
      headers: { Origin: "https://evil.attacker.com" },
    });
    expect(resDenied.headers.get("access-control-allow-origin")).toBeFalsy();
  });

  it("Security headers: menyertakan nosniff, DENY, strict-origin", async () => {
    const memDb = new Database(":memory:");
    const app = createApp(memDb);
    const res = await app.request("/health");

    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    const json = await res.json();
    expect(json).toEqual({ ok: true, service: "neoschola-api" });
  });

  it("Error masking: menyamarkan error message internal di production", async () => {
    const memDb = new Database(":memory:");
    const app = createApp(memDb, { nodeEnv: "production" });

    // Mount dummy test route
    app.get("/test-error", () => {
      throw new Error("Kredensial database bocor!");
    });

    const res = await app.request("/test-error");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error.message).toBe("Terjadi kesalahan internal pada server.");
    expect(data.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("Rate Limit Login: merespons 429 dan Retry-After setelah batas terlampaui", async () => {
    const memDb = new Database(":memory:");
    const app = createApp(memDb, {
      loginRateLimit: { windowMs: 10_000, max: 2 },
    });

    const postLogin = () =>
      app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "192.168.1.100",
        },
        body: JSON.stringify({ email: "test@example.com", password: "123" }),
      });

    const res1 = await postLogin();
    expect(res1.status).not.toBe(429);

    const res2 = await postLogin();
    expect(res2.status).not.toBe(429);

    const res3 = await postLogin();
    expect(res3.status).toBe(429);
    expect(res3.headers.get("Retry-After")).toBeDefined();
    const data = await res3.json();
    expect(data.error.code).toBe("RATE_LIMITED");
  });

  it("Rate Limit Write: membatasi mutasi POST/PATCH/DELETE pada /api/*", async () => {
    const memDb = new Database(":memory:");
    const app = createApp(memDb, {
      writeRateLimit: { windowMs: 10_000, max: 1 },
    });

    const postMutation = () =>
      app.request("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.1",
        },
        body: JSON.stringify({}),
      });

    const res1 = await postMutation();
    expect(res1.status).not.toBe(429);

    const res2 = await postMutation();
    expect(res2.status).toBe(429);
  });

  it("resetDemoDatabase: menolak reset tanpa allow flag dan berhasil me-reset DB", async () => {
    const tempDbPath = `/tmp/test-reset-demo-${Date.now()}.sqlite`;
    try {
      // Tolak jika allow = false
      expect(
        resetDemoDatabase({ allow: false, dbPath: tempDbPath })
      ).rejects.toThrow("Reset demo ditolak");

      // Berhasil jika allow = true
      await resetDemoDatabase({ allow: true, dbPath: tempDbPath });

      const checkDb = new Database(tempDbPath);
      const userCount = checkDb
        .query("SELECT COUNT(*) as count FROM users")
        .get() as { count: number };
      expect(userCount.count).toBeGreaterThan(0);
      checkDb.close();
    } finally {
      try {
        unlinkSync(tempDbPath);
      } catch {}
    }
  });
});
