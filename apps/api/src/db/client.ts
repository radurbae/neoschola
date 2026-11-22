import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface CreateDatabaseOptions {
  path?: string;
  inMemory?: boolean;
}

const DEFAULT_DB_PATH = resolve(import.meta.dir, "../../data/neoschola.sqlite");

export function createDatabase(options: CreateDatabaseOptions = {}): Database {
  if (options.inMemory || options.path === ":memory:") {
    const db = new Database(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    return db;
  }

  const dbPath = options.path || process.env.DATABASE_PATH || DEFAULT_DB_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}
