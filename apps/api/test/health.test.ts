import { describe, expect, it, beforeAll } from "bun:test";
import { createDatabase } from "../src/db/client";
import { ensureSchema } from "../src/db/schema";
import { seedDatabase } from "../src/db/seed";
import { createApp } from "../src/app";

describe("NeoSchola API Foundation Smoke Tests", () => {
  let db: ReturnType<typeof createDatabase>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    db = createDatabase({ inMemory: true });
    ensureSchema(db);
    await seedDatabase(db, { force: true });
    app = createApp(db);
  });

  it("GET /health mengembalikan status ok dan nama service", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, service: "neoschola-api" });
  });

  it("POST /api/auth/login dengan kredensial demo valid mengembalikan token & user", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wali.budi@neoschola.demo",
        password: "neoschola123",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe("wali.budi@neoschola.demo");
    expect(body.user.role).toBe("GUARDIAN");
    expect(body.user.name).toBe("Budi Santoso");
  });

  it("POST /api/auth/login dengan password keliru mengembalikan 401 INVALID_CREDENTIALS", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wali.budi@neoschola.demo",
        password: "passwordsalah",
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("Isolasi anak: Guardian Budi hanya bisa melihat Raka dan Nadia, tidak bisa Dimas", async () => {
    // Login Budi
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wali.budi@neoschola.demo",
        password: "neoschola123",
      }),
    });
    const { token } = await loginRes.json();

    // GET /api/students
    const studentsRes = await app.request("/api/students", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(studentsRes.status).toBe(200);
    const { students } = await studentsRes.json();
    expect(students.length).toBe(2);
    const names = students.map((s: any) => s.full_name);
    expect(names).toContain("Raka Pratama");
    expect(names).toContain("Nadia Putri");
    expect(names).not.toContain("Dimas Mahendra");

    // Akses dashboard Dimas harus 403 Forbidden
    const dimasRes = await app.request("/api/students/std_dimas/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dimasRes.status).toBe(403);
    const dimasBody = await dimasRes.json();
    expect(dimasBody.error.code).toBe("FORBIDDEN_STUDENT_ACCESS");
  });
});
