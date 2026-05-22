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
