import { z } from "zod";

const schema = z.object({
  vanListingId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1).max(10),
});

type Db = {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
  };
  batch(stmts: unknown[]): Promise<unknown[]>;
};

export type ReorderInput = {
  db: Db;
  userId: string;
  body: unknown;
};

export type ReorderResponse =
  | { status: 200; body: { ok: true } }
  | { status: 400; body: { error: "invalid_payload" | "invalid_order" } }
  | { status: 404; body: { error: "listing_not_found" } }
  | { status: 500; body: { error: "internal" } };

export async function reorderPhotosHandler({
  db, userId, body,
}: ReorderInput): Promise<ReorderResponse> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "invalid_payload" } };

  const { vanListingId, orderedIds } = parsed.data;

  // Duplicate check
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { status: 400, body: { error: "invalid_order" } };
  }

  // Ownership
  const listing = await db
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(vanListingId, userId)
    .first<{ id: string }>();
  if (!listing) return { status: 404, body: { error: "listing_not_found" } };

  // Integrity: must equal the listing's full photo set
  const existing = await db
    .prepare("SELECT id FROM van_photo WHERE vanListingId = ?")
    .bind(vanListingId)
    .all<{ id: string }>();
  const existingIds = new Set(existing.results.map((r) => r.id));
  if (existingIds.size !== orderedIds.length) {
    return { status: 400, body: { error: "invalid_order" } };
  }
  for (const id of orderedIds) {
    if (!existingIds.has(id)) return { status: 400, body: { error: "invalid_order" } };
  }

  // Defence-in-depth: re-bind vanListingId on every UPDATE
  const stmts = orderedIds.map((id, idx) =>
    db
      .prepare("UPDATE van_photo SET position = ? WHERE id = ? AND vanListingId = ?")
      .bind(idx, id, vanListingId)
  );
  try {
    await db.batch(stmts);
  } catch {
    return { status: 500, body: { error: "internal" } };
  }
  return { status: 200, body: { ok: true } };
}
