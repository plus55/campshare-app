import { db } from "@/lib/db";

export const MAX_ICAL_FEED_BYTES = 1_048_576;

export function validateIcalFeedUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid iCal feed URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("iCal feeds must use HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("iCal feed URLs cannot contain credentials");
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
  const blockedNames = ["localhost", "localhost.localdomain"];
  const blockedSuffixes = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

  if (
    !hostname.includes(".") ||
    blockedNames.includes(hostname) ||
    blockedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  ) {
    throw new Error("iCal feed URL must use a public hostname");
  }

  return url.toString();
}

async function readLimitedText(resp: Response): Promise<string> {
  const declaredLength = Number(resp.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ICAL_FEED_BYTES) {
    throw new Error("iCal feed is too large");
  }
  if (!resp.body) return "";

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_ICAL_FEED_BYTES) {
      await reader.cancel();
      throw new Error("iCal feed is too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// Formatting (export)
// ---------------------------------------------------------------------------

export interface IcalEvent {
  uid: string;
  startMs: number;
  endMs: number; // exclusive (iCal convention for all-day events)
  summary: string;
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function buildIcal(calName: string, events: IcalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampShare//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName.replace(/[\\;,]/g, "\\$&")}`,
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTART;VALUE=DATE:${fmtDate(ev.startMs)}`,
      `DTEND;VALUE=DATE:${fmtDate(ev.endMs)}`,
      `SUMMARY:${ev.summary.replace(/[\\;,]/g, "\\$&")}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// Parsing (import)
// ---------------------------------------------------------------------------

export interface ParsedIcalEvent {
  uid: string;
  startMs: number;
  endMs: number; // exclusive
  cancelled: boolean;
}

export function parseIcal(text: string): ParsedIcalEvent[] {
  // Unfold folded lines (RFC 5545: CRLF + WSP = continuation)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");

  const events: ParsedIcalEvent[] = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(unfolded)) !== null) {
    const block = m[1];

    const uid = getProp(block, "UID");
    if (!uid) continue;

    const status = getProp(block, "STATUS");
    const cancelled = status === "CANCELLED";

    const dtstart = getProp(block, "DTSTART");
    const dtend = getProp(block, "DTEND");
    const duration = getProp(block, "DURATION");

    const startMs = dtstart ? parseIcalDate(dtstart) : null;
    if (startMs === null) continue;

    let endMs: number;
    if (dtend) {
      const parsed = parseIcalDate(dtend);
      if (parsed === null) continue;
      endMs = parsed;
    } else if (duration) {
      endMs = startMs + parseDuration(duration);
    } else {
      endMs = startMs + 86_400_000; // single all-day event
    }

    events.push({ uid, startMs, endMs, cancelled });
  }

  return events;
}

function getProp(block: string, name: string): string | undefined {
  // Matches "NAME:" or "NAME;param=val:" at line start
  const re = new RegExp(`^${name}[^:]*:(.+)$`, "m");
  return block.match(re)?.[1]?.trim();
}

function parseIcalDate(val: string): number | null {
  // All-day: YYYYMMDD
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(val);
  if (date) return Date.UTC(+date[1], +date[2] - 1, +date[3]);

  // Datetime: YYYYMMDDTHHmmss[Z]
  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(val);
  if (dt) {
    const ms = Date.UTC(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5], +dt[6]);
    // Normalise to UTC midnight for all-day semantics
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return null;
}

function parseDuration(val: string): number {
  let ms = 0;
  const w = val.match(/(\d+)W/);
  const d = val.match(/(\d+)D/);
  const h = val.match(/(\d+)H/);
  const mn = val.match(/(\d+)M/);
  const s = val.match(/(\d+)S/);
  if (w) ms += +w[1] * 7 * 86_400_000;
  if (d) ms += +d[1] * 86_400_000;
  if (h) ms += +h[1] * 3_600_000;
  if (mn) ms += +mn[1] * 60_000;
  if (s) ms += +s[1] * 1_000;
  return ms;
}

// ---------------------------------------------------------------------------
// Feed sync (used by the ical route + daily cron)
// ---------------------------------------------------------------------------

export async function syncIcalFeed(listingId: string, url: string): Promise<void> {
  const safeUrl = validateIcalFeedUrl(url);
  const resp = await fetch(safeUrl, {
    headers: { "User-Agent": "CampShare-iCal/1.0" },
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!resp.ok) throw new Error(`iCal fetch failed: ${resp.status}`);

  const contentType = resp.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
    throw new Error("iCal feed returned an HTML document");
  }

  const text = await readLimitedText(resp);
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("Response is not an iCal calendar");
  }
  const incoming = parseIcal(text);
  const nowSec = Math.floor(Date.now() / 1000);

  // Existing ical-sourced blocks for this listing
  const { results: existing } = await db()
    .prepare(
      "SELECT id, icalUid FROM availability_block WHERE vanListingId = ? AND icalUid IS NOT NULL"
    )
    .bind(listingId)
    .all<{ id: string; icalUid: string }>();

  const byUid = new Map(existing.map((r) => [r.icalUid, r.id]));
  const activeUids = new Set(
    incoming.filter((e) => !e.cancelled).map((e) => e.uid)
  );

  // Remove blocks whose events are gone or cancelled
  for (const [uid, blockId] of byUid) {
    if (!activeUids.has(uid)) {
      await db()
        .prepare("DELETE FROM availability_block WHERE id = ?")
        .bind(blockId)
        .run();
    }
  }

  // Upsert active events — endMs is iCal-exclusive, so subtract 1 day for storage
  for (const ev of incoming) {
    if (ev.cancelled) continue;
    const storedEnd = ev.endMs - 86_400_000;
    const existingId = byUid.get(ev.uid);

    if (existingId) {
      await db()
        .prepare(
          "UPDATE availability_block SET startDate = ?, endDate = ? WHERE id = ?"
        )
        .bind(ev.startMs, storedEnd, existingId)
        .run();
    } else {
      await db()
        .prepare(
          `INSERT INTO availability_block
             (id, vanListingId, startDate, endDate, reason, bookingId, icalUid, createdAt)
           VALUES (?, ?, ?, ?, 'host-blocked', NULL, ?, ?)`
        )
        .bind(crypto.randomUUID(), listingId, ev.startMs, storedEnd, ev.uid, nowSec)
        .run();
    }
  }
}
