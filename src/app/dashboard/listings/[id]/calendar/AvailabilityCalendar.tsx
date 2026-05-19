"use client";

import { useState } from "react";
import type { AvailabilityBlock } from "@/lib/types";

interface Props {
  listingId: string;
  initialBlocks: AvailabilityBlock[];
}

// Returns unix ms at NZ midnight for a Date (approximation: NZST is UTC+12, NZDT UTC+13)
function nzMidnight(y: number, m: number, d: number): number {
  // Store as UTC midnight — offset applied when displaying
  return Date.UTC(y, m, d);
}

function monthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function isBlocked(ts: number, blocks: AvailabilityBlock[]): string | null {
  for (const b of blocks) {
    if (ts >= b.startDate && ts <= b.endDate) return b.id;
  }
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AvailabilityCalendar({ listingId, initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(initialBlocks);
  const [selecting, setSelecting] = useState<number | null>(null); // start timestamp
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  async function toggleRange(startTs: number, endTs: number) {
    setError(null);
    const existingId = isBlocked(startTs, blocks);

    if (existingId) {
      // Delete the block
      const res = await fetch(`/api/listings/${listingId}/availability/${existingId}`, {
        method: "DELETE",
      });
      if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== existingId));
      else setError("Couldn't remove block.");
    } else {
      // Create a new host-blocked range
      const res = await fetch(`/api/listings/${listingId}/availability`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startDate: startTs, endDate: endTs, reason: "host-blocked" }),
      });
      if (res.ok) {
        const { id } = await res.json() as { id: string };
        const now = Math.floor(Date.now() / 1000);
        setBlocks((prev) => [
          ...prev,
          { id, vanListingId: listingId, startDate: startTs, endDate: endTs, reason: "host-blocked", bookingId: null, createdAt: now },
        ]);
      } else {
        setError("Couldn't save block.");
      }
    }
    setSelecting(null);
  }

  function handleCellMouseDown(ts: number) {
    setSelecting(ts);
  }

  function handleCellMouseUp(ts: number) {
    if (selecting === null) return;
    const start = Math.min(selecting, ts);
    const end = Math.max(selecting, ts);
    void toggleRange(start, end);
  }

  return (
    <>
      {error && <div className="cs-error">{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {months.map(({ year, month }) => {
          const days = monthDays(year, month);
          const firstDow = days[0].getDay();

          return (
            <div key={`${year}-${month}`}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                {MONTHS[month]} {year}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {DAYS.map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--clay)", paddingBottom: 4 }}>
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => {
                  const ts = nzMidnight(day.getFullYear(), day.getMonth(), day.getDate());
                  const blockId = isBlocked(ts, blocks);
                  const isPast = day < today && day.toDateString() !== today.toDateString();

                  return (
                    <button
                      key={ts}
                      type="button"
                      disabled={isPast}
                      onMouseDown={() => handleCellMouseDown(ts)}
                      onMouseUp={() => handleCellMouseUp(ts)}
                      style={{
                        padding: "6px 2px",
                        textAlign: "center",
                        fontSize: 13,
                        border: "1px solid var(--sand-200)",
                        borderRadius: 4,
                        background: isPast ? "transparent" : blockId ? "var(--clay)" : "var(--sand-100)",
                        color: isPast ? "var(--sand-300)" : blockId ? "#fff8ef" : "inherit",
                        cursor: isPast ? "default" : "pointer",
                        userSelect: "none",
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="cs-muted cs-small" style={{ marginTop: 16 }}>
        Click a date to block/unblock it. Click and drag to select a range.
      </p>
    </>
  );
}
