import { db } from "./db";

export interface AuditEntry {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db()
      .prepare(
        "INSERT INTO audit_log (id, actorUserId, action, targetType, targetId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        entry.actorUserId,
        entry.action,
        entry.targetType,
        entry.targetId,
        JSON.stringify(entry.metadata ?? {}),
        Math.floor(Date.now() / 1000)
      )
      .run();
  } catch (e) {
    console.error("Failed to write audit_log entry", { entry, error: e });
  }
}
