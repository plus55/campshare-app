"use client";

import { useState } from "react";
import type { AvailabilityBlock } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function findBlock(ts: number, blocks: AvailabilityBlock[]): AvailabilityBlock | null {
  for (const b of blocks) {
    if (ts >= b.startDate && ts <= b.endDate) return b;
  }
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AvailabilityCalendar({ listingId, initialBlocks, icalFeedUrl, exportUrl }: Props) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(initialBlocks);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (hit.icalUid) {
        setError("This date is blocked by an imported calendar and cannot be removed manually.");
        return;
      }
      const res = await fetch(`/api/listings/${listingId}/availability/${hit.id}`, { method: "DELETE" });
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
          { id, vanListingId: listingId, startDate: startTs, endDate: endTs, reason: "host-blocked", bookingId: null, icalUid: null, createdAt: now },
        ]);
      } else {
        setError("Couldn't save block.");
      }
    }
    setSelecting(null);
  }

  function handleCellMouseDown(ts: number) { setSelecting(ts); }
  function handleCellMouseUp(ts: number) {
    if (selecting === null) return;
    void toggleRange(Math.min(selecting, ts), Math.max(selecting, ts));
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
      const blocksRes = await fetch(`/api/listings/${listingId}/availability`);
      if (blocksRes.ok) setBlocks((await blocksRes.json()) as AvailabilityBlock[]);
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setImportMsg(body.error ?? "Sync failed.");
    }
  }

  async function handleImportRemove() {
    setImportSaving(true);
    setImportMsg(null);
    const res = await fetch(`/api/listings/${listingId}/ical`, { method: "DELETE" });
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

  const isError = (msg: string) => msg.includes("fail") || msg.includes("ould");

  return (
    <>
      {error && <div className="mb-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{error}</div>}

      {/* Calendar grid */}
      <div className="flex flex-col gap-8">
        {months.map(({ year, month }) => {
          const days = monthDays(year, month);
          const firstDow = days[0].getDay();
          return (
            <div key={`${year}-${month}`}>
              <p className="mb-2 font-semibold text-foreground">{MONTHS[month]} {year}</p>
              <div className="grid grid-cols-7 gap-0.5">
                {DAYS.map((d) => (
                  <div key={d} className="pb-1 text-center text-[11px] text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
                {days.map((day) => {
                  const ts = nzMidnight(day.getFullYear(), day.getMonth(), day.getDate());
                  const block = findBlock(ts, blocks);
                  const isIcal = !!block?.icalUid;
                  const isBooked = block?.reason === "booking";
                  const isPast = day < today && day.toDateString() !== today.toDateString();

                  let cellStyle: React.CSSProperties = { background: "var(--sand-100)" };
                  if (isPast)    cellStyle = { background: "transparent", color: "var(--sand-300)" };
                  else if (isBooked) cellStyle = { background: "var(--forest)", color: "#fff" };
                  else if (isIcal)   cellStyle = { background: "var(--sand-300)", color: "var(--clay)" };
                  else if (block)    cellStyle = { background: "var(--clay)", color: "#fff8ef" };

                  return (
                    <button
                      key={ts}
                      type="button"
                      disabled={isPast || isBooked}
                      title={isBooked ? "Booking" : isIcal ? "External calendar block" : undefined}
                      onMouseDown={() => handleCellMouseDown(ts)}
                      onMouseUp={() => handleCellMouseUp(ts)}
                      className="rounded border border-border py-1.5 text-center text-[13px] select-none transition-opacity disabled:cursor-default"
                      style={{ ...cellStyle, cursor: isPast || isBooked ? "default" : "pointer" }}
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

      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-clay" /> Blocked by you
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sand-warm" /> External calendar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-forest" /> Booked
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Click a date to block / unblock. Click and drag to select a range.
      </p>

      {/* iCal export */}
      <hr className="my-7 border-border" />
      <h3 className="mb-1.5 font-serif text-base text-forest-deep dark:text-cream">Export calendar</h3>
      <p className="mb-2.5 text-[13px] text-muted-foreground">
        Subscribe to this URL in Google Calendar, Apple Calendar, or any app that supports iCal to see your bookings and blocked dates.
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="calendar-export-url" className="sr-only">Export calendar URL</label>
        <Input
          id="calendar-export-url"
          readOnly
          className="h-9 flex-1 text-[13px]"
          value={exportUrl}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(exportUrl)}>
          Copy
        </Button>
      </div>

      {/* iCal import */}
      <hr className="my-7 border-border" />
      <h3 className="mb-1.5 font-serif text-base text-forest-deep dark:text-cream">Import external calendar</h3>
      <p className="mb-2.5 text-[13px] text-muted-foreground">
        Paste an iCal feed URL (e.g. from Airbnb or another platform) to automatically block those dates here. Synced daily.
      </p>
      {importMsg && (
        <div className={`mb-2.5 rounded-lg px-3.5 py-2.5 text-sm ${isError(importMsg) ? "bg-destructive/10 text-destructive" : "bg-moss/10 text-moss"}`} aria-live="polite">
          {importMsg}
        </div>
      )}
      <div className="flex gap-2">
        <label htmlFor="calendar-import-url" className="sr-only">External calendar URL</label>
        <Input
          id="calendar-import-url"
          type="url"
          className="h-9 flex-1 text-[13px]"
          placeholder="https://www.airbnb.com/calendar/ical/…"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          disabled={importSaving}
        />
        <Button
          type="button"
          disabled={importSaving || !importUrl.trim()}
          onClick={() => void handleImportSave()}
        >
          {importSaving ? "Syncing…" : activeIcalUrl ? "Re-sync" : "Connect"}
        </Button>
        {activeIcalUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={importSaving}
            onClick={() => void handleImportRemove()}
          >
            Remove
          </Button>
        )}
      </div>
    </>
  );
}
