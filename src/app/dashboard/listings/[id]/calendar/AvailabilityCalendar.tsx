"use client";

import { useState } from "react";
import type { AvailabilityBlock } from "@/lib/types";

interface Props {
  listingId: string;
  initialBlocks: AvailabilityBlock[];
  icalFeedUrl: string | null;
  exportUrl: string;
}

function nzMidnight(y: number, m: number, d: number): number {
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

function findBlock(
  ts: number,
  blocks: AvailabilityBlock[]
): AvailabilityBlock | null {
  for (const b of blocks) {
    if (ts >= b.startDate && ts <= b.endDate) return b;
  }
  return null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AvailabilityCalendar({
  listingId,
  initialBlocks,
  icalFeedUrl,
  exportUrl,
}: Props) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(initialBlocks);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // iCal import state
  const [importUrl, setImportUrl] = useState(icalFeedUrl ?? "");
  const [importSaving, setImportSaving] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [activeIcalUrl, setActiveIcalUrl] = useState<string | null>(icalFeedUrl);

  const today = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  async function toggleRange(startTs: number, endTs: number) {
    setError(null);
    const hit = findBlock(startTs, blocks);

    if (hit) {
      // Prevent deletion of ical-imported blocks
      if (hit.icalUid) {
        setError("This date is blocked by an imported calendar and cannot be removed manually.");
        return;
      }
      const res = await fetch(
        `/api/listings/${listingId}/availability/${hit.id}`,
        { method: "DELETE" }
      );
      if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== hit.id));
      else setError("Couldn't remove block.");
    } else {
      const res = await fetch(`/api/listings/${listingId}/availability`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startDate: startTs, endDate: endTs, reason: "host-blocked" }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        const now = Math.floor(Date.now() / 1000);
        setBlocks((prev) => [
          ...prev,
          {
            id,
            vanListingId: listingId,
            startDate: startTs,
            endDate: endTs,
            reason: "host-blocked",
            bookingId: null,
            icalUid: null,
            createdAt: now,
          },
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

  async function handleImportSave() {
    setImportSaving(true);
    setImportMsg(null);
    const url = importUrl.trim();
    const res = await fetch(`/api/listings/${listingId}/ical`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setImportSaving(false);
    if (res.ok) {
      setActiveIcalUrl(url);
      setImportMsg("Calendar synced successfully.");
      // Reload blocks so ical-sourced ones appear
      const blocksRes = await fetch(
        `/api/listings/${listingId}/availability`
      );
      if (blocksRes.ok) {
        const data = (await blocksRes.json()) as AvailabilityBlock[];
        setBlocks(data);
      }
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setImportMsg(body.error ?? "Sync failed.");
    }
  }

  async function handleImportRemove() {
    setImportSaving(true);
    setImportMsg(null);
    const res = await fetch(`/api/listings/${listingId}/ical`, {
      method: "DELETE",
    });
    setImportSaving(false);
    if (res.ok) {
      setActiveIcalUrl(null);
      setImportUrl("");
      setImportMsg("Calendar disconnected.");
      setBlocks((prev) => prev.filter((b) => b.icalUid === null));
    } else {
      setImportMsg("Couldn't remove calendar.");
    }
  }

  return (
    <>
      {error && <div className="cs-error">{error}</div>}

      {/* Calendar grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {months.map(({ year, month }) => {
          const days = monthDays(year, month);
          const firstDow = days[0].getDay();

          return (
            <div key={`${year}-${month}`}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                {MONTHS[month]} {year}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 2,
                }}
              >
                {DAYS.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      color: "var(--clay)",
                      paddingBottom: 4,
                    }}
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const ts = nzMidnight(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate()
                  );
                  const block = findBlock(ts, blocks);
                  const isIcal = !!block?.icalUid;
                  const isBooked = block?.reason === "booking";
                  const isPast =
                    day < today &&
                    day.toDateString() !== today.toDateString();

                  let bg = "var(--sand-100)";
                  let color = "inherit";
                  if (isPast) { bg = "transparent"; color = "var(--sand-300)"; }
                  else if (isBooked) { bg = "var(--forest)"; color = "#fff"; }
                  else if (isIcal) { bg = "var(--sand-300)"; color = "var(--clay)"; }
                  else if (block) { bg = "var(--clay)"; color = "#fff8ef"; }

                  return (
                    <button
                      key={ts}
                      type="button"
                      disabled={isPast || isBooked}
                      title={
                        isBooked
                          ? "Booking"
                          : isIcal
                          ? "External calendar block"
                          : undefined
                      }
                      onMouseDown={() => handleCellMouseDown(ts)}
                      onMouseUp={() => handleCellMouseUp(ts)}
                      style={{
                        padding: "6px 2px",
                        textAlign: "center",
                        fontSize: 13,
                        border: "1px solid var(--sand-200)",
                        borderRadius: 4,
                        background: bg,
                        color,
                        cursor: isPast || isBooked ? "default" : "pointer",
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

      <div
        className="cs-small cs-muted"
        style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--clay)",
              borderRadius: 2,
              marginRight: 4,
            }}
          />
          Blocked by you
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--sand-300)",
              borderRadius: 2,
              marginRight: 4,
            }}
          />
          External calendar
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--forest)",
              borderRadius: 2,
              marginRight: 4,
            }}
          />
          Booked
        </span>
      </div>
      <p className="cs-muted cs-small" style={{ marginTop: 4 }}>
        Click a date to block / unblock. Click and drag to select a range.
      </p>

      {/* iCal export */}
      <hr style={{ border: "none", borderTop: "1px solid var(--sand-200)", margin: "28px 0 20px" }} />
      <h3>Export calendar</h3>
      <p className="cs-muted cs-small">
        Subscribe to this URL in Google Calendar, Apple Calendar, or any app
        that supports iCal to see your bookings and blocked dates.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <input
          readOnly
          className="cs-input"
          value={exportUrl}
          onFocus={(e) => e.currentTarget.select()}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button
          type="button"
          className="cs-btn cs-btn-ghost"
          onClick={() => void navigator.clipboard.writeText(exportUrl)}
        >
          Copy
        </button>
      </div>

      {/* iCal import */}
      <hr style={{ border: "none", borderTop: "1px solid var(--sand-200)", margin: "28px 0 20px" }} />
      <h3>Import external calendar</h3>
      <p className="cs-muted cs-small">
        Paste an iCal feed URL (e.g. from Airbnb or another platform) to
        automatically block those dates here. Synced daily.
      </p>
      {importMsg && (
        <div
          className={importMsg.includes("fail") || importMsg.includes("ould") ? "cs-error" : "cs-success"}
          style={{ marginTop: 10 }}
        >
          {importMsg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          type="url"
          className="cs-input"
          placeholder="https://www.airbnb.com/calendar/ical/…"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          disabled={importSaving}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button
          type="button"
          className="cs-btn cs-btn-primary"
          disabled={importSaving || !importUrl.trim()}
          onClick={() => void handleImportSave()}
        >
          {importSaving ? "Syncing…" : activeIcalUrl ? "Re-sync" : "Connect"}
        </button>
        {activeIcalUrl && (
          <button
            type="button"
            className="cs-btn cs-btn-ghost"
            disabled={importSaving}
            onClick={() => void handleImportRemove()}
          >
            Remove
          </button>
        )}
      </div>
    </>
  );
}
