# Photo Reorder — Touch Support + Batched Persist

**Sprint:** S10 — Host Tools + Hardening
**Status:** Spec approved 2026-05-23; awaiting implementation plan
**Owner:** Jonty (single-developer project)

## Goal

Phone and tablet hosts must be able to reorder photos in `PhotoManager` with the same fluency as desktop hosts already have. Replace the current `Promise.all` PATCH loop with a single batched server call to eliminate "partial reorder" races.

This spec is the first feature run through the Superpowers brainstorming → writing-plans → execution discipline adopted at `2026-05-23-superpowers-adoption` (see `D:\programs\CampShareValt\9-Wiki\decisions\`).

## Scope

In-scope:
- Touch support for photo reorder on iOS Safari + Android Chrome via pointer events
- New `POST /api/photos/reorder` endpoint that writes all photo positions in a single D1 batch
- Optimistic UI with rollback toast on failure
- Auto-scroll while dragging near the top/bottom 60px of the viewport
- Explicit `☰` drag handle in each photo card (visible on all viewports)
- Pure-function tests for the server handler and the gesture state machine

Out of scope (deferred to S11):
- Keyboard reorder, screen-reader announcements, WCAG-grade rebuild — covered by the S11 accessibility pass
- Horizontal-strip auto-scroll (the gallery is a vertical grid)
- CI workflow for `npm test` — flagged for `01-Tech-Readiness`
- Easing curves on the auto-scroll speed (linear-proportional is enough for v1)

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Success criterion | Mobile parity with desktop drag UX | Closes the actual gap; accessibility deferred to S11 |
| Persist behaviour | Optimistic UI + rollback toast on POST failure | Snappy feel; rural-NZ cellular failures are visible to the user |
| Drag affordance | Explicit `☰` handle in photo corner | Discoverability + low accidental-trigger risk while scrolling |
| Long-press threshold | 300ms on the handle | Standard; cancelled if pointer moves >8px before timer fires |
| Auto-scroll edges | Top + bottom 60px zones, linear-proportional speed up to 12 px/frame | Mandatory for long galleries (Camplify NZ audit: 8–15 photos typical) |
| Pickup feedback | scale(1.05) + box-shadow + `navigator.vibrate(8)` where supported | iOS Photos / Google Photos parity; degrades silently on iOS |
| Implementation approach | Roll our own pointer-event handler alongside existing HTML5 DnD | 0 KB bundle delta; ~80 lines of new code; keeps the working desktop path untouched |

## Architecture

Two changed files, one new file. No schema migration — reuses `van_photo.position`.

```
Client (one file changed)
└─ src/app/dashboard/listings/[id]/photos/PhotoManager.tsx
   ├─ existing: HTML5 DnD handlers + Promise.all PATCH loop  (desktop OK)
   ├─ added:    ☰ handle render + pointer-event state machine (mobile)
   └─ changed:  Promise.all PATCH loop → single fetch to /api/photos/reorder
                (used by both desktop and mobile paths)

Server (one file added, one extracted)
├─ src/app/api/photos/reorder/route.ts          NEW — thin Next route shell
└─ src/app/api/photos/reorder/handler.ts        NEW — pure handler for unit tests
```

Two input channels (HTML5 DnD on desktop; pointer events on touch) feed the same optimistic-update + POST function. The endpoint doesn't know or care which channel produced the order.

## Server — `POST /api/photos/reorder`

### Request

```ts
{ vanListingId: string, orderedIds: string[] }
```

### Auth + ownership

1. `auth.api.getSession()` — 401 if no session
2. `SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?` — 403 if not owner / 404 if listing absent

Reuses the pattern in `src/app/api/photos/[id]/route.ts`.

### Integrity check

`SELECT id FROM van_photo WHERE vanListingId = ?`. The returned set MUST equal `orderedIds` as a multiset (same size, same members). Rejects:
- Photos missing from the request (caller would drop them silently otherwise)
- Foreign photo IDs (defence against ID-smuggling)
- Duplicates

Returns `400 { error: 'invalid_order' }` on mismatch.

### Write

Single D1 batch:

```ts
const stmts = orderedIds.map((id, idx) =>
  db().prepare(
    'UPDATE van_photo SET position = ? WHERE id = ? AND vanListingId = ?'
  ).bind(idx, id, vanListingId)
);
await db().batch(stmts);
```

`vanListingId` is re-bound on every UPDATE as defence-in-depth — even if the integrity check were bypassed, a hostile client cannot mutate a foreign listing's photos.

### Responses

| Status | Body | When |
|---|---|---|
| 200 | `{ ok: true }` | Success |
| 400 | `{ error: 'invalid_order' }` | Integrity check failure |
| 401 | `{ error: 'unauthenticated' }` | No session |
| 403 | `{ error: 'forbidden' }` | Listing not owned by user |
| 404 | `{ error: 'listing_not_found' }` | Listing absent |
| 500 | `{ error: 'internal' }` | D1 batch failure (Sentry-logged once 01-Tech-Readiness lands) |

### Rate limit

Piggy-back on the existing pattern in `src/lib/rate-limit.ts`. Bucket choice (existing `RATE_LIMIT_BOOKINGS` vs a new dedicated bucket) is a plan-time decision — both work for this volume. No new Cloudflare binding required if reusing an existing bucket.

## Client — `PhotoManager` state machine

The gesture model is a small finite state machine. Holding it in a `useRef` (not React state) avoids re-render churn during the 60-frame-per-second pointer-move stream.

### States

| State | Carries |
|---|---|
| `idle` | — |
| `pressing` | `startedAt`, `photoId`, `startX`, `startY` |
| `picked-up` | `photoId`, `currentX`, `currentY`, `prevOrder` snapshot |
| `dragging` | `picked-up` + active drop-target index |

### Transitions

| From | Event | To | Side effects |
|---|---|---|---|
| `idle` | `pointerdown` on ☰ handle | `pressing` | start 300ms timer |
| `pressing` | `pointermove` with hypot ≥ 8px | `idle` | clear timer (user is scrolling) |
| `pressing` | `pointerup` before timer | `idle` | clear timer (just a tap) |
| `pressing` | 300ms timer fires | `picked-up` | apply lift+shadow+scale, `navigator.vibrate(8)`, snapshot `prevOrder` |
| `picked-up` | `pointermove` | `dragging` | apply transform; hit-test sibling midpoints; trigger auto-scroll if in edge zone |
| `picked-up`, `dragging` | `pointerup` | `drop`* | (see drop below) |
| `picked-up`, `dragging` | `pointercancel` | `idle` | release transform; `stopAutoscroll()`; no POST |

*`drop` is a transient state that runs the post-drop logic then returns to `idle`.

### Drop logic

```ts
if (newOrder same as prevOrder) → idle (no-op)
else {
  setPhotos(newOrder);                          // optimistic
  fetch('/api/photos/reorder', { ... })
    .then(r => r.ok || throw)
    .catch(() => {
      setPhotos(prevOrder);                     // rollback
      toast.error("Couldn't save photo order — try again");
    });
}
```

The batch is all-or-nothing on the server (D1 `batch()` semantics), so the DB state is never partially mutated. No automatic retry — if the host cares, they can re-drag.

### Visual feedback

While `picked-up` or `dragging`:
- Picked-up photo: `transform: scale(1.05); box-shadow: 0 12px 24px rgba(0,0,0,0.18); z-index: 10; transition: transform 120ms`
- Sibling photos: `transition: transform 160ms` and shift to make room as the drag passes their midpoint

### Handle render

- Small `☰` icon, absolutely positioned `top-2 right-2` inside each photo card
- ~32×32 hit target
- `touch-action: none` on the handle (suppresses page scroll only when the gesture starts on the handle)
- Visible on all viewports — desktop hosts gain it as an alternative to the existing HTML5 drag-from-anywhere

### Coexistence with HTML5 DnD

- HTML5 DnD listeners stay attached to the photo card surface (not the handle)
- Pointer-event listeners attach only to the handle
- A guard `isPointerActive: boolean` ref prevents both paths from firing simultaneously — last-touch-wins

## Auto-scroll while dragging

Active only in `picked-up` or `dragging`.

### Edge detection

- On every `pointermove`, compute pointer Y relative to the viewport
- "Edge zone" = top 60px or bottom 60px of `window.innerHeight`
- Speed: `((60 - distFromEdge) / 60) * MAX_SPEED` where `MAX_SPEED = 12 px/frame`
- Direction: `-1` for top edge, `+1` for bottom edge

### RAF loop

```ts
const tickRef = useRef<number | null>(null);
function startAutoscroll(direction: -1 | 1, speedFn: () => number) {
  if (tickRef.current != null) return;
  const tick = () => {
    window.scrollBy(0, direction * speedFn());
    tickRef.current = requestAnimationFrame(tick);
  };
  tickRef.current = requestAnimationFrame(tick);
}
function stopAutoscroll() {
  if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
  tickRef.current = null;
}
```

`speedFn` is a closure over the live pointer-Y ref, so depth-into-edge updates as the finger moves.

### Lifecycle

- Enter edge zone → `startAutoscroll(dir, speedFn)`
- Leave edge zone → `stopAutoscroll()`
- Drop or `pointercancel` → `stopAutoscroll()` unconditionally
- Component unmount → `stopAutoscroll()` in `useEffect` cleanup

### Edge cases

- `pointercancel` (incoming call, OS gesture, two-finger pinch) → treat as cancel; release picked-up; `stopAutoscroll()`
- Page already at `scrollTop=0` and direction=-1 → `window.scrollBy` is a harmless no-op

## Error handling

Failures from most-likely to least-likely:

1. **POST returns non-2xx / network unreachable** → rollback + toast
2. **400 `invalid_order`** (multi-tab stale state) → rollback + `"Photo list is out of sync — refreshing"` toast + auto-refresh 1.5s later
3. **`pointercancel` mid-drag** → release picked-up; no POST; visible state unchanged from before pickup
4. **Component unmount mid-drag** → cleanup cancels RAF; any in-flight POST is allowed to settle on its own (both outcomes are valid)
5. **D1 batch fails** → server returns 500; client treats as case 1; Sentry catches once `01-Tech-Readiness` lands
6. **Race producing duplicate positions** — cannot happen; every reorder rewrites all positions for the listing from the supplied `orderedIds` as the source of truth. Reads use `ORDER BY position ASC, id ASC` (already the case) for deterministic tiebreak.

No new error types added to `src/lib/types.ts`.

## Testing

This feature isn't on the TDD-mandatory list from `2026-05-23-superpowers-adoption` (booking / payments / KYC / payouts / deposits / disputes are). It's run through the discipline as a precedent for the test layer.

### 1. Server: pure handler tests

Extract route logic into a testable function:

```ts
// src/app/api/photos/reorder/handler.ts  (new)
export async function reorderPhotosHandler({
  userId, vanListingId, orderedIds, db
}: ReorderInput): Promise<ReorderResult> { ... }

// src/app/api/photos/reorder/route.ts  (thin shell)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession(/* … */);
  const body = await req.json();
  return jsonResponse(await reorderPhotosHandler({
    userId: session.user.id, ...body, db: db()
  }));
}
```

Test cases (no Miniflare needed — pass a stub `db` with `prepare()` + `batch()`):

- Happy path returns `{ ok: true }`
- Missing/null `vanListingId` → 400
- Ownership check fails → 403
- `orderedIds` missing a photo for the listing → 400
- `orderedIds` includes a foreign photo ID → 400
- `orderedIds` has duplicates → 400
- Batch composes N statements with correct `(position, id, vanListingId)` bindings

### 2. Client: gesture state machine — pure reducer tests

```ts
// src/app/dashboard/listings/[id]/photos/dragReducer.ts  (new)
type State = 'idle' | { kind: 'pressing', ... } | { kind: 'picked-up', ... } | { kind: 'dragging', ... };
type Event = { kind: 'pointerdown', ... } | { kind: 'timer-300ms' } | { kind: 'pointermove', ... } | { kind: 'pointerup' } | { kind: 'pointercancel' };
export function reduce(state: State, event: Event): State { ... }
```

Cover every transition in the table above.

### 3. Out of scope for automated tests (manual only)

- Optimistic + rollback path
- Auto-scroll RAF loop
- Haptic / visual feedback
- HTML5 + pointer-event coexistence guard

### 4. Manual verification

- iPhone Safari: long-press handle → lift + haptic → drag past 3 photos → release → order persists after reload → DevTools shows one `POST /api/photos/reorder`
- Android Chrome: same; haptic fires
- Desktop Chrome: HTML5 DnD still works (drag the photo surface); ☰ handle also works
- Long gallery (12+ photos): drag near top edge → page auto-scrolls; same near bottom
- "Slow 3G" throttle: drag a photo, see optimistic move, watch rollback toast appear when the POST times out
- Open two tabs, delete a photo in one, drag in the other → 400 `invalid_order` → refresh toast fires

### 5. Test runner

- `package.json` does not yet include Vitest as of this spec — plan must add it as a dev dep
- Pure-function tests need no config beyond default Vitest
- Establishes the foundation that Miniflare + worker-route tests will build on for the TDD-mandatory features in S11+

### 6. CI

Out of scope for this feature. `npm test` in a GitHub Actions workflow is flagged for `01-Tech-Readiness`.

## File scope (final)

| Path | Status | Approx LoC |
|---|---|---|
| `src/app/api/photos/reorder/route.ts` | NEW | ~25 |
| `src/app/api/photos/reorder/handler.ts` | NEW | ~70 |
| `src/app/api/photos/reorder/handler.test.ts` | NEW | ~120 |
| `src/app/dashboard/listings/[id]/photos/PhotoManager.tsx` | MODIFIED | +120 / −15 |
| `src/app/dashboard/listings/[id]/photos/dragReducer.ts` | NEW | ~80 |
| `src/app/dashboard/listings/[id]/photos/dragReducer.test.ts` | NEW | ~100 |
| `package.json` | MODIFIED | +1 dev dep (Vitest) |

No schema migration. No new Cloudflare bindings (rate-limit reuses existing).

## Verification — end-to-end

After implementation, the verification section of the existing S10 plan applies: smoke the booking funnel and the iCal/Turnstile/rate-limit flows to confirm S10 hardening isn't disturbed.

## Related

- `D:\Campshare\CAMPSHARE.CO.NZ\SPRINT.md` — S10 sprint state; this closes item #4
- `~/.claude/plans/elegant-gliding-meadow.md` — pre-Superpowers plan that initially scoped this work; superseded by this spec for item #4 only
- `D:\programs\CampShareValt\9-Wiki\decisions\2026-05-23-superpowers-adoption.md` — adoption rationale
- `D:\programs\CampShareValt\9-Wiki\concepts\Superpowers-Skills-Framework.md` — skill catalogue
