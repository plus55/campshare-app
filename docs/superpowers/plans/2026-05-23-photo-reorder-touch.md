# Photo Reorder — Touch Support + Batched Persist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between the existing partial implementation of photo reorder and the target state from `docs/superpowers/specs/2026-05-23-photo-reorder-touch-design.md` — add an explicit `☰` handle, auto-scroll while held, richer pickup feedback, server defence-in-depth, and a TDD test layer.

**Architecture:** The endpoint and pointer-event scaffold already exist in the working tree (untracked). This plan refactors the route into a pure handler + thin shell (testable without Miniflare), extracts the gesture state into a pure reducer (unit-testable), and layers the missing UX (handle, auto-scroll, feedback). Tests use Vitest pure-function style — no DOM, no Worker runtime.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Cloudflare D1 via `db()` from `@/lib/db` · Better Auth via `getSession()` from `@/lib/session` · Zod for request validation · Vitest (new dev dep) for tests.

---

## Pre-flight context (read once before starting)

- **Spec:** `docs/superpowers/specs/2026-05-23-photo-reorder-touch-design.md`
- **Current state:** `src/app/api/photos/reorder/route.ts` (45 lines, untracked) + `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx` (271 lines, modified) already implement a basic version
- **Repo state warning:** the working tree has 24 modified + many untracked files unrelated to this work. **Do NOT use `git add -A` or `git add .`** — every commit step in this plan stages specific paths only.
- **No commits land on `main` until the existing working-tree tangle is sorted by Jonty** — this plan stages and commits each task in isolation; if the engineer is uncertain whether to land any commit, ask Jonty first.
- **Branch policy:** stay on whatever branch is currently checked out (likely `main`). If the engineer wants a feature branch, they can `git switch -c feat/photo-reorder-polish` before Task 1, but that's optional.

---

## File Structure

| Path | Status after plan | Responsibility |
|---|---|---|
| `src/app/api/photos/reorder/handler.ts` | NEW | Pure async function: validate, check ownership, check integrity (incl. duplicate guard), compose D1 batch. Takes `db`, `userId`, `body` as args. No `Request` / `NextResponse` / session lookup. |
| `src/app/api/photos/reorder/route.ts` | REWRITTEN | Thin Next.js shell: parse body, call `getSession()`, call `handler`, map result → `NextResponse`. |
| `src/app/api/photos/reorder/handler.test.ts` | NEW | Vitest tests for `handler.ts` using fake `db`. |
| `src/app/dashboard/listings/[id]/photos/dragReducer.ts` | NEW | Pure state machine. Exports `type State`, `type Event`, `function reduce(state, event): State`, `function initialState(): State`. |
| `src/app/dashboard/listings/[id]/photos/dragReducer.test.ts` | NEW | Vitest tests for every transition. |
| `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx` | MODIFIED | Replace inline useState gesture vars with `useReducer(reduce, initialState())`. Add `☰` handle render. Restrict pointer-event listeners to handle only. Add scale-1.05 + box-shadow on picked-up. Add `navigator.vibrate(8)`. Add auto-scroll RAF loop. |
| `package.json` | MODIFIED | Add `vitest` to devDependencies. Add `"test": "vitest"` script. |
| `vitest.config.ts` | NEW | Minimal Vitest config (jsdom not needed — pure-function tests only). |

---

## Task 1: Add Vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest as a dev dep**

Run: `npm install -D vitest@^2`
Expected: `package.json` shows `"vitest"` under `devDependencies`; `package-lock.json` updated.

- [ ] **Step 2: Add a `test` script to `package.json`**

Open `package.json`. In `"scripts"`, add `"test": "vitest"` and `"test:run": "vitest run"` between `"typecheck"` and `"deploy"`. The scripts block should look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create file `vitest.config.ts` at the repo root with:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Verify Vitest runs (no tests yet)**

Run: `npm run test:run`
Expected: `No test files found` or `Test Files  0 passed` — exits 0 cleanly.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for pure-function tests"
```

---

## Task 2: Write failing tests for the pure handler

**Files:**
- Create: `src/app/api/photos/reorder/handler.test.ts`

- [ ] **Step 1: Write the test file with all 7 cases**

Create `src/app/api/photos/reorder/handler.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, verify they fail with "module not found"**

Run: `npm run test:run`
Expected: FAIL with `Cannot find module './handler'` or similar.

---

## Task 3: Implement the pure handler

**Files:**
- Create: `src/app/api/photos/reorder/handler.ts`

- [ ] **Step 1: Write `handler.ts`**

Create `src/app/api/photos/reorder/handler.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, verify all 7 pass**

Run: `npm run test:run`
Expected: `7 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/photos/reorder/handler.ts src/app/api/photos/reorder/handler.test.ts
git commit -m "feat(api): extract pure photo-reorder handler with duplicate + defence-in-depth checks"
```

---

## Task 4: Rewrite `route.ts` as a thin shell over the handler

**Files:**
- Modify: `src/app/api/photos/reorder/route.ts`

- [ ] **Step 1: Replace the existing route.ts contents entirely**

Replace `src/app/api/photos/reorder/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { reorderPhotosHandler } from "./handler";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await reorderPhotosHandler({
    db: db(),
    userId: session.user.id,
    body,
  });
  return NextResponse.json(result.body, { status: result.status });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/photos/reorder/route.ts
git commit -m "refactor(api): photo-reorder route delegates to pure handler"
```

---

## Task 5: Write failing tests for the gesture reducer

**Files:**
- Create: `src/app/dashboard/listings/[id]/photos/dragReducer.test.ts`

- [ ] **Step 1: Write the test file covering every transition**

Create `src/app/dashboard/listings/[id]/photos/dragReducer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reduce, initialState, type State, type Event } from "./dragReducer";

const photoId = "p1";
const otherId = "p2";

describe("dragReducer", () => {
  it("starts in idle", () => {
    expect(initialState()).toEqual({ kind: "idle" });
  });

  it("idle + pointerdown(handle) -> pressing", () => {
    const next = reduce(initialState(), {
      kind: "pointerdown", photoId, x: 100, y: 200, t: 0,
    });
    expect(next).toEqual({
      kind: "pressing", photoId, startX: 100, startY: 200, startedAt: 0,
    });
  });

  it("pressing + pointermove within 8px -> still pressing", () => {
    const s: State = { kind: "pressing", photoId, startX: 100, startY: 200, startedAt: 0 };
    const next = reduce(s, { kind: "pointermove", x: 104, y: 203, t: 50 });
    expect(next.kind).toBe("pressing");
  });

  it("pressing + pointermove beyond 8px -> idle (scroll, not drag)", () => {
    const s: State = { kind: "pressing", photoId, startX: 100, startY: 200, startedAt: 0 };
    const next = reduce(s, { kind: "pointermove", x: 100, y: 220, t: 50 });
    expect(next).toEqual({ kind: "idle" });
  });

  it("pressing + pointerup before timer -> idle (just a tap)", () => {
    const s: State = { kind: "pressing", photoId, startX: 100, startY: 200, startedAt: 0 };
    const next = reduce(s, { kind: "pointerup" });
    expect(next).toEqual({ kind: "idle" });
  });

  it("pressing + timer -> picked-up", () => {
    const s: State = { kind: "pressing", photoId, startX: 100, startY: 200, startedAt: 0 };
    const next = reduce(s, { kind: "timer-300ms" });
    expect(next).toEqual({
      kind: "picked-up", photoId, currentX: 100, currentY: 200,
    });
  });

  it("picked-up + pointermove -> dragging with updated coords", () => {
    const s: State = { kind: "picked-up", photoId, currentX: 100, currentY: 200 };
    const next = reduce(s, { kind: "pointermove", x: 150, y: 260, t: 350 });
    expect(next).toEqual({
      kind: "dragging", photoId, currentX: 150, currentY: 260,
    });
  });

  it("dragging + pointermove -> dragging with updated coords", () => {
    const s: State = { kind: "dragging", photoId, currentX: 150, currentY: 260 };
    const next = reduce(s, { kind: "pointermove", x: 170, y: 320, t: 400 });
    expect(next).toEqual({
      kind: "dragging", photoId, currentX: 170, currentY: 320,
    });
  });

  it("picked-up + pointerup -> drop", () => {
    const s: State = { kind: "picked-up", photoId, currentX: 100, currentY: 200 };
    const next = reduce(s, { kind: "pointerup" });
    expect(next).toEqual({ kind: "drop", photoId });
  });

  it("dragging + pointerup -> drop", () => {
    const s: State = { kind: "dragging", photoId, currentX: 150, currentY: 260 };
    const next = reduce(s, { kind: "pointerup" });
    expect(next).toEqual({ kind: "drop", photoId });
  });

  it("picked-up + pointercancel -> idle", () => {
    const s: State = { kind: "picked-up", photoId, currentX: 100, currentY: 200 };
    const next = reduce(s, { kind: "pointercancel" });
    expect(next).toEqual({ kind: "idle" });
  });

  it("dragging + pointercancel -> idle", () => {
    const s: State = { kind: "dragging", photoId, currentX: 150, currentY: 260 };
    const next = reduce(s, { kind: "pointercancel" });
    expect(next).toEqual({ kind: "idle" });
  });

  it("drop -> idle on next event (reset transition)", () => {
    const s: State = { kind: "drop", photoId };
    const next = reduce(s, { kind: "pointerdown", photoId: otherId, x: 10, y: 20, t: 1000 });
    // drop is transient — any next event treats us as idle for transition purposes
    expect(next.kind).toBe("pressing");
  });

  it("ignores events that don't apply to current state", () => {
    const s: State = { kind: "idle" };
    expect(reduce(s, { kind: "pointermove", x: 1, y: 1, t: 0 })).toEqual({ kind: "idle" });
    expect(reduce(s, { kind: "pointerup" })).toEqual({ kind: "idle" });
    expect(reduce(s, { kind: "timer-300ms" })).toEqual({ kind: "idle" });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail with module-not-found**

Run: `npm run test:run`
Expected: FAIL with `Cannot find module './dragReducer'`.

---

## Task 6: Implement the pure reducer

**Files:**
- Create: `src/app/dashboard/listings/[id]/photos/dragReducer.ts`

- [ ] **Step 1: Write the reducer**

Create `src/app/dashboard/listings/[id]/photos/dragReducer.ts`:

```ts
export type State =
  | { kind: "idle" }
  | { kind: "pressing"; photoId: string; startX: number; startY: number; startedAt: number }
  | { kind: "picked-up"; photoId: string; currentX: number; currentY: number }
  | { kind: "dragging"; photoId: string; currentX: number; currentY: number }
  | { kind: "drop"; photoId: string };

export type Event =
  | { kind: "pointerdown"; photoId: string; x: number; y: number; t: number }
  | { kind: "pointermove"; x: number; y: number; t: number }
  | { kind: "pointerup" }
  | { kind: "pointercancel" }
  | { kind: "timer-300ms" };

const PRESS_CANCEL_DISTANCE_PX = 8;

export function initialState(): State {
  return { kind: "idle" };
}

export function reduce(state: State, event: Event): State {
  // drop is transient — collapse to idle before applying the next event
  const effective: State = state.kind === "drop" ? { kind: "idle" } : state;

  switch (effective.kind) {
    case "idle":
      if (event.kind === "pointerdown") {
        return {
          kind: "pressing",
          photoId: event.photoId,
          startX: event.x,
          startY: event.y,
          startedAt: event.t,
        };
      }
      return effective;

    case "pressing": {
      if (event.kind === "pointermove") {
        const dx = event.x - effective.startX;
        const dy = event.y - effective.startY;
        if (Math.hypot(dx, dy) >= PRESS_CANCEL_DISTANCE_PX) {
          return { kind: "idle" };
        }
        return effective;
      }
      if (event.kind === "pointerup" || event.kind === "pointercancel") {
        return { kind: "idle" };
      }
      if (event.kind === "timer-300ms") {
        return {
          kind: "picked-up",
          photoId: effective.photoId,
          currentX: effective.startX,
          currentY: effective.startY,
        };
      }
      return effective;
    }

    case "picked-up":
    case "dragging": {
      if (event.kind === "pointermove") {
        return {
          kind: "dragging",
          photoId: effective.photoId,
          currentX: event.x,
          currentY: event.y,
        };
      }
      if (event.kind === "pointerup") {
        return { kind: "drop", photoId: effective.photoId };
      }
      if (event.kind === "pointercancel") {
        return { kind: "idle" };
      }
      return effective;
    }

    case "drop":
      return effective; // unreachable due to early collapse above
  }
}
```

- [ ] **Step 2: Run tests, verify all reducer tests pass**

Run: `npm run test:run`
Expected: all reducer tests + all handler tests pass (`20 passed` give or take).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/listings/[id]/photos/dragReducer.ts src/app/dashboard/listings/[id]/photos/dragReducer.test.ts
git commit -m "feat(photos): extract pure drag state machine with tests"
```

---

## Task 7: Wire the reducer into `PhotoManager` (refactor, no behaviour change yet)

**Files:**
- Modify: `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx`

This task replaces the three useState gesture vars (`touchDragIdx`, `touchOverIdx`, `dragIdx`) and the inline long-press logic with a `useReducer` driven by `dragReducer`. The user-visible behaviour stays the same as today (long-press anywhere on the photo, scale 1.03 + opacity 0.5). Handle, scale 1.05, haptic, and auto-scroll come in subsequent tasks.

- [ ] **Step 1: Replace the gesture section of `PhotoManager.tsx`**

Open `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx`. Locate the gesture block at lines ~95–175 (from `// Drag-to-reorder` comment down through `onPointerCancel`). Replace that whole block with:

```tsx
  // Drag-to-reorder — desktop uses HTML5 DnD, touch uses pointer events with long-press
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [drag, dispatchDrag] = useReducer(reduce, undefined, initialState);
  const longPressTimerRef = useRef<number | null>(null);
  const previousPhotosRef = useRef<VanPhoto[] | null>(null);
  const hoverIdxRef = useRef<number | null>(null);

  // Drop side effect: when the reducer enters 'drop', persist the order and reset.
  // The reducer collapses any next event from 'drop' back to 'idle', so dispatching
  // a single pointercancel is enough to reset.
  useEffect(() => {
    if (drag.kind !== "drop") return;
    const fromIdx = photos.findIndex((p) => p.id === drag.photoId);
    const toIdx = hoverIdxRef.current;
    hoverIdxRef.current = null;
    dispatchDrag({ kind: "pointercancel" });
    if (fromIdx >= 0 && toIdx !== null && fromIdx !== toIdx) {
      void movePhoto(fromIdx, toIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag.kind]);

  async function movePhoto(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    previousPhotosRef.current = photos;
    const reordered = [...photos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPositions = reordered.map((p, i) => ({ ...p, position: i }));
    setPhotos(withPositions);

    try {
      const res = await fetch("/api/photos/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vanListingId: listingId,
          orderedIds: withPositions.map((p) => p.id),
        }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      if (previousPhotosRef.current) setPhotos(previousPhotosRef.current);
      setError("Couldn't save new order.");
    }
  }

  function cancelLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, idx: number, photoId: string) {
    if (e.pointerType !== "touch") return;
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    cancelLongPress();
    dispatchDrag({ kind: "pointerdown", photoId, x: e.clientX, y: e.clientY, t: e.timeStamp });
    longPressTimerRef.current = window.setTimeout(() => {
      target.setPointerCapture(pointerId);
      dispatchDrag({ kind: "timer-300ms" });
      hoverIdxRef.current = idx;
    }, 300);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;
    dispatchDrag({ kind: "pointermove", x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (drag.kind === "picked-up" || drag.kind === "dragging") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const tile = el?.closest("[data-photo-idx]") as HTMLElement | null;
      if (tile) {
        const overIdx = Number(tile.dataset.photoIdx);
        if (!Number.isNaN(overIdx)) hoverIdxRef.current = overIdx;
      }
    } else {
      // still pressing — if reducer collapsed to idle, cancel timer
      if (drag.kind === "idle") cancelLongPress();
    }
  }

  function onPointerUp() {
    cancelLongPress();
    dispatchDrag({ kind: "pointerup" });
  }

  function onPointerCancel() {
    cancelLongPress();
    dispatchDrag({ kind: "pointercancel" });
  }
```

- [ ] **Step 2: Update imports at the top of the file**

Replace the existing import line `import { useRef, useState } from "react";` with:

```tsx
import { useEffect, useReducer, useRef, useState } from "react";
import { initialState, reduce } from "./dragReducer";
```

- [ ] **Step 3: Update the photo card JSX to use the new state**

In the `photos.map` render block, replace the existing computations:

```tsx
const isTouchDragging = touchDragIdx === idx;
const isTouchOver = touchDragIdx !== null && touchOverIdx === idx && touchDragIdx !== idx;
```

with:

```tsx
const draggedPhotoId = drag.kind === "picked-up" || drag.kind === "dragging" ? drag.photoId : null;
const isTouchDragging = draggedPhotoId === photo.id;
const isTouchOver = draggedPhotoId !== null && hoverIdxRef.current === idx && draggedPhotoId !== photo.id;
```

And update the `onPointerDown` handler binding from:

```tsx
onPointerDown={(e) => onPointerDown(e, idx)}
```

to:

```tsx
onPointerDown={(e) => onPointerDown(e, idx, photo.id)}
```

And update the inline `touchAction` style from `touchAction: touchDragIdx !== null ? "none" : "auto"` to `touchAction: drag.kind === "picked-up" || drag.kind === "dragging" ? "none" : "auto"`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. If errors, fix in place (do not commit a broken state).

- [ ] **Step 5: Run unit tests**

Run: `npm run test:run`
Expected: all tests still pass (we only refactored; tests don't touch the component).

- [ ] **Step 6: Manual smoke**

Run `npm run dev`. Open the photos page for any listing. On desktop:
- HTML5 drag a photo card → drops at new position → order persists. (Unchanged from before — this verifies we didn't break the desktop path.)

On a mobile device or Chrome DevTools touch emulation:
- Long-press a photo (300ms) → it lifts slightly (opacity 0.5, scale 1.03 from existing code) → drag to a new position → release → order persists.

If both work, the refactor is behaviour-preserving.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/listings/[id]/photos/PhotoManager.tsx
git commit -m "refactor(photos): drive drag gesture from pure reducer"
```

---

## Task 8: Add the `☰` drag handle

**Files:**
- Modify: `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx`

The pointer-event listeners currently attach to the entire photo card. Move them onto a small `☰` handle in the top-right corner. The card surface keeps the HTML5 DnD listeners (desktop) but loses the touch listeners.

- [ ] **Step 1: Refactor the card render**

In `photos.map`, restructure the card JSX so the outer `<div>` keeps the HTML5 DnD handlers but removes the pointer handlers, and a new `<button>` (the handle) gets the pointer handlers. Update the photo card markup to:

```tsx
<div
  key={photo.id}
  data-photo-idx={idx}
  draggable
  onDragStart={() => setDragIdx(idx)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={() => {
    if (dragIdx !== null) void movePhoto(dragIdx, idx);
    setDragIdx(null);
  }}
  style={{
    position: "relative",
    border: isTouchOver ? "2px solid var(--clay)" : "1px solid var(--sand-200)",
    borderRadius: 8,
    overflow: "hidden",
    cursor: "grab",
    opacity: dragIdx === idx || isTouchDragging ? 0.5 : 1,
    transform: isTouchDragging ? "scale(1.03)" : "none",
    transition: "transform 120ms ease, border-color 80ms ease",
  }}
>
  <button
    type="button"
    aria-label="Reorder photo"
    onPointerDown={(e) => onPointerDown(e, idx, photo.id)}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
    style={{
      position: "absolute",
      top: 6,
      right: 6,
      width: 32,
      height: 32,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.9)",
      border: "1px solid var(--sand-200)",
      borderRadius: 6,
      cursor: "grab",
      touchAction: "none",
      zIndex: 2,
      fontSize: 16,
      lineHeight: 1,
      color: "var(--ink)",
      padding: 0,
    }}
  >
    ☰
  </button>
  {url && (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url} alt={photo.caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />
  )}
  {!url && (
    <div style={{ width: "100%", aspectRatio: "4/3", background: "var(--sand-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="cs-muted cs-small">photo</span>
    </div>
  )}
  <div style={{ padding: 8 }}>
    {idx === 0 && <p className="cs-small cs-muted" style={{ margin: "0 0 4px" }}>Cover</p>}
    <input
      className="cs-input"
      style={{ fontSize: 12, padding: "4px 6px" }}
      placeholder="Caption…"
      defaultValue={photo.caption ?? ""}
      onBlur={(e) => void updateCaption(photo.id, e.target.value)}
    />
    <button
      type="button"
      className="cs-btn cs-btn-danger"
      style={{ marginTop: 6, fontSize: 12, padding: "4px 8px" }}
      onClick={() => void deletePhoto(photo.id)}
    >
      Remove
    </button>
  </div>
</div>
```

Key changes vs Task 7:
- `position: "relative"` added to the outer div so the handle can absolute-position inside it
- `touchAction` removed from the outer div (no longer needed there)
- `onPointer*` handlers removed from the outer div
- New `<button>` with `aria-label="Reorder photo"`, `touchAction: "none"`, and all four `onPointer*` handlers

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual smoke**

`npm run dev`, open photo page, on a touch device or DevTools touch emulation:
- Long-press the handle (☰ icon) → photo lifts; release without dragging → returns to idle.
- Long-press the photo body (not the handle) → nothing happens (touch listeners no longer attached there).
- Try to scroll the page by dragging from a photo's image area → page scrolls normally (no accidental drag triggers).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/listings/[id]/photos/PhotoManager.tsx
git commit -m "feat(photos): explicit drag handle, restricted pointer events"
```

---

## Task 9: Pickup feedback — scale 1.05, box-shadow, haptic

**Files:**
- Modify: `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx`

- [ ] **Step 1: Update the picked-up visual treatment**

Find the outer photo `<div>`'s `style` object in `photos.map`. Replace it with:

```tsx
style={{
  position: "relative",
  border: isTouchOver ? "2px solid var(--clay)" : "1px solid var(--sand-200)",
  borderRadius: 8,
  overflow: "hidden",
  cursor: "grab",
  opacity: dragIdx === idx ? 0.5 : 1,
  transform: isTouchDragging ? "scale(1.05)" : "none",
  boxShadow: isTouchDragging ? "0 12px 24px rgba(0,0,0,0.18)" : "none",
  zIndex: isTouchDragging ? 10 : "auto",
  transition: "transform 120ms ease, box-shadow 120ms ease, border-color 80ms ease",
}}
```

Note: the picked-up photo no longer goes semi-transparent; it scales and lifts instead.

- [ ] **Step 2: Add haptic tap on pickup**

In `onPointerDown`, inside the `setTimeout` callback (where we dispatch `timer-300ms`), add a single line right after `dispatchDrag({ kind: "timer-300ms" })`:

```tsx
if (typeof navigator !== "undefined" && "vibrate" in navigator) {
  navigator.vibrate?.(8);
}
```

The full updated `onPointerDown` block:

```tsx
function onPointerDown(e: React.PointerEvent<HTMLDivElement>, idx: number, photoId: string) {
  if (e.pointerType !== "touch") return;
  const pointerId = e.pointerId;
  const target = e.currentTarget;
  cancelLongPress();
  dispatchDrag({ kind: "pointerdown", photoId, x: e.clientX, y: e.clientY, t: e.timeStamp });
  longPressTimerRef.current = window.setTimeout(() => {
    target.setPointerCapture(pointerId);
    dispatchDrag({ kind: "timer-300ms" });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
    hoverIdxRef.current = idx;
  }, 300);
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual smoke**

`npm run dev`, on an Android device (haptic-capable) or DevTools:
- Long-press handle → photo scales up to ~1.05, box-shadow appears beneath it, photo appears to lift.
- On Android: a single short haptic tap fires on pickup.
- On iOS Safari: no haptic (Vibration API not exposed), but visual still works.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/listings/[id]/photos/PhotoManager.tsx
git commit -m "feat(photos): scale-1.05 + shadow + haptic on pickup"
```

---

## Task 10: Auto-scroll while dragging

**Files:**
- Modify: `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx`

- [ ] **Step 1: Add auto-scroll refs and helpers**

Inside `PhotoManager`, just above `function cancelLongPress()`, add:

```tsx
const tickRef = useRef<number | null>(null);
const autoscrollDirRef = useRef<-1 | 0 | 1>(0);
const autoscrollSpeedRef = useRef<number>(0);

function startAutoscroll() {
  if (tickRef.current !== null) return;
  const tick = () => {
    const dir = autoscrollDirRef.current;
    const speed = autoscrollSpeedRef.current;
    if (dir !== 0 && speed > 0) {
      window.scrollBy(0, dir * speed);
    }
    tickRef.current = requestAnimationFrame(tick);
  };
  tickRef.current = requestAnimationFrame(tick);
}

function stopAutoscroll() {
  if (tickRef.current !== null) {
    cancelAnimationFrame(tickRef.current);
    tickRef.current = null;
  }
  autoscrollDirRef.current = 0;
  autoscrollSpeedRef.current = 0;
}

function updateAutoscrollFromY(clientY: number) {
  const EDGE = 60;
  const MAX_SPEED = 12;
  const vh = window.innerHeight;
  if (clientY < EDGE) {
    autoscrollDirRef.current = -1;
    autoscrollSpeedRef.current = ((EDGE - clientY) / EDGE) * MAX_SPEED;
    startAutoscroll();
  } else if (clientY > vh - EDGE) {
    autoscrollDirRef.current = 1;
    autoscrollSpeedRef.current = ((clientY - (vh - EDGE)) / EDGE) * MAX_SPEED;
    startAutoscroll();
  } else {
    autoscrollDirRef.current = 0;
    autoscrollSpeedRef.current = 0;
    // tick keeps running but does no-op; we stop it on pointerup/cancel below
  }
}
```

- [ ] **Step 2: Hook auto-scroll into `onPointerMove`**

Update `onPointerMove` to call `updateAutoscrollFromY` while picked-up or dragging:

```tsx
function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "touch") return;
  dispatchDrag({ kind: "pointermove", x: e.clientX, y: e.clientY, t: e.timeStamp });
  if (drag.kind === "picked-up" || drag.kind === "dragging") {
    updateAutoscrollFromY(e.clientY);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tile = el?.closest("[data-photo-idx]") as HTMLElement | null;
    if (tile) {
      const overIdx = Number(tile.dataset.photoIdx);
      if (!Number.isNaN(overIdx)) hoverIdxRef.current = overIdx;
    }
  } else if (drag.kind === "idle") {
    cancelLongPress();
  }
}
```

- [ ] **Step 3: Stop auto-scroll on pointerup / pointercancel / unmount**

Update `onPointerUp`:

```tsx
function onPointerUp() {
  cancelLongPress();
  stopAutoscroll();
  dispatchDrag({ kind: "pointerup" });
}
```

Update `onPointerCancel`:

```tsx
function onPointerCancel() {
  cancelLongPress();
  stopAutoscroll();
  dispatchDrag({ kind: "pointercancel" });
}
```

Add an unmount cleanup near the top of the component (just after `useEffect(() => { ... }, [drag.kind])`):

```tsx
useEffect(() => {
  return () => {
    stopAutoscroll();
    cancelLongPress();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Manual smoke**

`npm run dev`. Upload at least 8 photos to a listing so the gallery is taller than the viewport on mobile. In DevTools touch emulation:
- Long-press handle on the first photo → drag pointer toward the top of the viewport (within ~60px of the top edge) → page scrolls up automatically.
- Drag pointer toward the bottom edge → page scrolls down automatically.
- Move pointer back to the middle → scrolling stops.
- Release → scrolling stops; reorder persists.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/listings/[id]/photos/PhotoManager.tsx
git commit -m "feat(photos): auto-scroll while dragging near viewport edges"
```

---

## Task 11: Final verification — full flow on device

**Files:** none — verification only.

- [ ] **Step 1: All automated tests pass**

Run: `npm run test:run`
Expected: all tests pass (~20).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Real-device verification**

If a phone is available, run `npm run dev` and access from the phone (LAN IP per the auto-memory `feedback-campshare-dev-lan-oauth` — set BETTER_AUTH_URL to the LAN IP if testing auth flows). Verify:

- iPhone Safari: long-press handle → lift + shadow → drag past 3 photos → release → order persists after reload → DevTools (remote-inspect from Mac) shows ONE `POST /api/photos/reorder`.
- Android Chrome: same; haptic fires on pickup.
- Auto-scroll: long gallery, drag near top/bottom → scrolls.
- Network failure: Chrome DevTools → Network → "Offline" → drag a photo → rollback toast appears → photos snap back to original order.

- [ ] **Step 4: Regression sweep**

Smoke the existing photo flows to confirm nothing else broke:
- Upload a new photo → appears
- Edit a caption → persists on blur
- Delete a photo → vanishes
- HTML5 desktop drag (drag the photo body, not the handle) → still works

- [ ] **Step 5: Update spec / sprint**

Edit `D:\Campshare\CAMPSHARE.CO.NZ\SPRINT.md` and tick `[ ]` → `[x]` next to "Drag-to-reorder van photos".

Run:
```bash
git add SPRINT.md
git commit -m "chore: tick S10 drag-reorder item"
```

- [ ] **Step 6: Notify Jonty**

Report:
- Tasks complete: 11/11
- Files added: 5 (handler.ts, handler.test.ts, dragReducer.ts, dragReducer.test.ts, vitest.config.ts)
- Files modified: 3 (PhotoManager.tsx, route.ts, package.json)
- Test count: ~20 passing
- Smoke verifications: list each that passed

Hand off to whoever (Jonty / next session) will decide on deploy timing. **Do NOT run `npm run deploy`** without explicit go-ahead — there are 24 unrelated modified files in the working tree and a deploy would ship the lot.

---

## Self-review summary

Checked against the spec at `docs/superpowers/specs/2026-05-23-photo-reorder-touch-design.md`:

- ✓ Explicit `☰` handle (Task 8)
- ✓ Auto-scroll 60px edge zones, linear-proportional, max 12 px/frame (Task 10)
- ✓ Pickup feedback: scale(1.05) + shadow + haptic (Task 9)
- ✓ Server: duplicate-ID check (Task 3 handler)
- ✓ Server: defence-in-depth `vanListingId` re-bind on UPDATE (Task 3 handler)
- ✓ Pure handler extracted + tests (Tasks 2–4)
- ✓ Pure reducer extracted + tests (Tasks 5–7)
- ✓ Vitest test runner added (Task 1)
- ✓ Optimistic UI + rollback toast — already present, preserved through refactor (Task 7)
- ✓ HTML5 DnD desktop path preserved — handle is opt-in, body keeps HTML5 listeners (Task 8 verification)

No placeholders. All type names consistent across tasks (`State`, `Event`, `reduce`, `initialState`, `reorderPhotosHandler`, `ReorderInput`, `ReorderResponse`). All file paths absolute or repo-relative consistently.
