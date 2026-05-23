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
  }
}
