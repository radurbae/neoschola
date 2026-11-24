import { createDatabase } from "./client";
import { seedDatabase } from "./seed";

export async function resetDemoDatabase(
  options: { allow?: boolean; dbPath?: string } = {}
): Promise<void> {
  const allowed = options.allow ?? process.env.ALLOW_DEMO_RESET === "true";
  if (!allowed) {
    throw new Error(
      "Reset demo ditolak: setel ALLOW_DEMO_RESET=true untuk menjalankan reset."
    );
  }

  const db = createDatabase(options.dbPath ? { path: options.dbPath } : {});
  try {
    await seedDatabase(db, { force: true });
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  try {
    await resetDemoDatabase();
    console.log("Database demo berhasil di-reset ke data awal.");
  } catch (error: any) {
    console.error(`Gagal reset demo: ${error.message}`);
    process.exit(1);
  }
}
