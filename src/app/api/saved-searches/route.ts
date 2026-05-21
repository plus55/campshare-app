import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";

export interface SavedSearchFilters {
  region?: string;
  vanType?: string;
  sleeps?: string;
  minRate?: string;
  maxRate?: string;
  petFriendly?: string;
  instantBook?: string;
  startDate?: string;
  endDate?: string;
}

const ALLOWED_KEYS: (keyof SavedSearchFilters)[] = [
  "region", "vanType", "sleeps", "minRate", "maxRate",
  "petFriendly", "instantBook", "startDate", "endDate",
];

function sanitizeFilters(input: unknown): SavedSearchFilters {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const out: SavedSearchFilters = {};
  for (const key of ALLOWED_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && v.length > 0 && v.length < 200) {
      out[key] = v;
    }
  }
  return out;
}

export async function GET() {
  const session = await requireSession();
  const { results } = await db()
    .prepare(
      "SELECT id, label, filters, lastAlertedAt, createdAt FROM saved_search WHERE userId = ? ORDER BY createdAt DESC"
    )
    .bind(session.user.id)
    .all<{ id: string; label: string | null; filters: string; lastAlertedAt: number | null; createdAt: number }>();
  return NextResponse.json({ searches: results });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json() as { filters?: unknown; label?: string };

  const filters = sanitizeFilters(body.filters);
  if (Object.keys(filters).length === 0) {
    return NextResponse.json({ error: "At least one filter is required" }, { status: 400 });
  }

  const label = typeof body.label === "string" && body.label.trim().length > 0
    ? body.label.trim().slice(0, 80)
    : null;

  const id = randomUUID();
  const nowSec = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      "INSERT INTO saved_search (id, userId, label, filters, lastAlertedAt, createdAt) VALUES (?, ?, ?, ?, NULL, ?)"
    )
    .bind(id, session.user.id, label, JSON.stringify(filters), nowSec)
    .run();

  return NextResponse.json({ id, label, filters, createdAt: nowSec });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await db()
    .prepare("DELETE FROM saved_search WHERE id = ? AND userId = ?")
    .bind(id, session.user.id)
    .run();
  return NextResponse.json({ ok: true });
}
