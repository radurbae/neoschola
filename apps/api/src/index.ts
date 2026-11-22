import { createDatabase } from "./db/client";
import { ensureSchema } from "./db/schema";
import { seedDatabase } from "./db/seed";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);

const db = createDatabase();
ensureSchema(db);
await seedDatabase(db);

const app = createApp(db);

console.log(`Server NeoSchola API berjalan di http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
