import { db } from "./db";

export type NotificationType =
  | "booking_requested"
  | "booking_accepted"
  | "booking_declined"
  | "booking_cancelled"
  | "review_prompt"
  | "review_received"
  | "host_response"
  | "message"
  | "payout_sent"
  | "deposit_released";

export interface NotificationEntry {
  userId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  payload: string;
  readAt: number | null;
  createdAt: number;
}

export async function createNotification(entry: NotificationEntry): Promise<void> {
  try {
    await db()
      .prepare(
        "INSERT INTO notification (id, userId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        entry.userId,
        entry.type,
        JSON.stringify(entry.payload ?? {}),
        Math.floor(Date.now() / 1000)
      )
      .run();
  } catch (e) {
    console.error("Failed to write notification", { entry, error: e });
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const row = await db()
    .prepare("SELECT COUNT(*) AS cnt FROM notification WHERE userId = ? AND readAt IS NULL")
    .bind(userId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}
