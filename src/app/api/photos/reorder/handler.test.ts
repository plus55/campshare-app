import { describe, it, expect, vi } from "vitest";
import { reorderPhotosHandler } from "./handler";

function fakeDb(opts: {
  listingRow?: { id: string } | null;
  photoRows?: { id: string }[];
  batchThrows?: boolean;
}) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const batchedStmts: { sql: string; binds: unknown[] }[] = [];
  const prepare = (sql: string) => {
    const stmt = {
      _binds: [] as unknown[],
      bind(...args: unknown[]) {
        stmt._binds = args;
        return stmt;
      },
      async first() {
        calls.push({ sql, binds: stmt._binds });
        if (sql.startsWith("SELECT id FROM van_listing")) return opts.listingRow ?? null;
        return null;
      },
      async all() {
        calls.push({ sql, binds: stmt._binds });
        if (sql.startsWith("SELECT id FROM van_photo")) return { results: opts.photoRows ?? [] };
        return { results: [] };
      },
    };
    return stmt;
  };
  const batch = async (stmts: { sql: string; _binds: unknown[] }[]) => {
    if (opts.batchThrows) throw new Error("D1 batch failed");
    for (const s of stmts) batchedStmts.push({ sql: s.sql, binds: s._binds });
    return [];
  };
  return {
    db: { prepare, batch } as unknown as Parameters<typeof reorderPhotosHandler>[0]["db"],
    calls,
    batchedStmts,
  };
}

describe("reorderPhotosHandler", () => {
  const userId = "user-1";
  const vanListingId = "listing-1";

  it("returns 200 with batch on happy path", async () => {
    const { db, batchedStmts } = fakeDb({
      listingRow: { id: vanListingId },
      photoRows: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p3", "p1", "p2"] },
    });
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(batchedStmts).toHaveLength(3);
    expect(batchedStmts[0].binds).toEqual([0, "p3", vanListingId]);
    expect(batchedStmts[1].binds).toEqual([1, "p1", vanListingId]);
    expect(batchedStmts[2].binds).toEqual([2, "p2", vanListingId]);
  });

  it("rejects 400 when body is invalid", async () => {
    const { db } = fakeDb({});
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId: "", orderedIds: [] },
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not owned by user", async () => {
    const { db } = fakeDb({ listingRow: null });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p1"] },
    });
    expect(res).toEqual({ status: 404, body: { error: "listing_not_found" } });
  });

  it("returns 400 when orderedIds is missing a photo", async () => {
    const { db } = fakeDb({
      listingRow: { id: vanListingId },
      photoRows: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p1", "p2"] },
    });
    expect(res).toEqual({ status: 400, body: { error: "invalid_order" } });
  });

  it("returns 400 when orderedIds contains a foreign id", async () => {
    const { db } = fakeDb({
      listingRow: { id: vanListingId },
      photoRows: [{ id: "p1" }, { id: "p2" }],
    });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p1", "p2", "p3"] },
    });
    expect(res).toEqual({ status: 400, body: { error: "invalid_order" } });
  });

  it("returns 400 when orderedIds has duplicates", async () => {
    const { db } = fakeDb({
      listingRow: { id: vanListingId },
      photoRows: [{ id: "p1" }, { id: "p2" }],
    });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p1", "p1"] },
    });
    expect(res).toEqual({ status: 400, body: { error: "invalid_order" } });
  });

  it("returns 500 when batch throws", async () => {
    const { db } = fakeDb({
      listingRow: { id: vanListingId },
      photoRows: [{ id: "p1" }],
      batchThrows: true,
    });
    const res = await reorderPhotosHandler({
      db, userId, body: { vanListingId, orderedIds: ["p1"] },
    });
    expect(res).toEqual({ status: 500, body: { error: "internal" } });
  });
});
