import type { Announcement } from "@neoschola/shared";

const DISMISSED_STORAGE_PREFIX = "neoschola_dismissed_announcements_";
const memoryDismissedStorage: Record<string, string> = {};

function getStorageKey(userId?: string): string {
  return `${DISMISSED_STORAGE_PREFIX}${userId || "anon"}`;
}

function readRawValue(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryDismissedStorage[key] ?? null;
}

function writeRawValue(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  memoryDismissedStorage[key] = value;
}

export function getDismissedAnnouncementIds(userId?: string): string[] {
  const raw = readRawValue(getStorageKey(userId));
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function dismissAnnouncementId(
  announcementId: string,
  userId?: string
): string[] {
  const current = getDismissedAnnouncementIds(userId);
  if (current.includes(announcementId)) {
    return current;
  }

  const next = [...current, announcementId];
  writeRawValue(getStorageKey(userId), JSON.stringify(next));
  return next;
}

function compareCreatedAtDesc(aDate: string, bDate: string): number {
  const aMs = Date.parse(aDate);
  const bMs = Date.parse(bDate);
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) {
    return bMs - aMs;
  }
  return bDate.localeCompare(aDate);
}

export function pickHighlightAnnouncement(
  announcements: Announcement[],
  dismissedIds: string[]
): Announcement | null {
  const dismissedSet = new Set(dismissedIds);
  const candidates = announcements.filter((item) => !dismissedSet.has(item.id));
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    const aUrgent = a.category === "DARURAT" ? 1 : 0;
    const bUrgent = b.category === "DARURAT" ? 1 : 0;
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;

    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    return compareCreatedAtDesc(a.created_at, b.created_at);
  });

  return sorted[0] ?? null;
}
