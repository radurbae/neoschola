import type { Database } from "bun:sqlite";
import type { NotificationType } from "@neoschola/shared";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  referenceId?: string | null;
}

export function createNotification(
  db: Database,
  params: CreateNotificationParams
): void {
  const id = `notif_${crypto.randomUUID().slice(0, 12)}`;
  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, type, reference_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);
  stmt.run(
    id,
    params.userId,
    params.title,
    params.body,
    params.type,
    params.referenceId ?? null
  );
}

export function createNotifications(
  db: Database,
  paramsList: CreateNotificationParams[]
): void {
  if (paramsList.length === 0) return;
  const stmt = db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, type, reference_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  const runMany = db.transaction(() => {
    for (const p of paramsList) {
      const id = `notif_${crypto.randomUUID().slice(0, 12)}`;
      stmt.run(id, p.userId, p.title, p.body, p.type, p.referenceId ?? null);
    }
  });
  runMany();
}
