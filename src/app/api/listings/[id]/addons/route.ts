import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const result = await db()
    .prepare(
      `SELECT la.id, la.addonId, la.priceNZDCents,
              a.name, a.description, a.priceType, a.sortOrder
       FROM listing_addon la
       JOIN addon a ON a.id = la.addonId
       WHERE la.vanListingId = ?
       ORDER BY a.sortOrder`
    )
    .bind(id)
    .all<{
      id: string;
      addonId: string;
      priceNZDCents: number;
      name: string;
      description: string | null;
      priceType: string;
      sortOrder: number;
    }>();

  return NextResponse.json(result.results);
}

const saveSchema = z.array(
  z.object({
    addonId: z.string().min(1),
    priceNZDCents: z.number().int().min(0),
  })
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const items = parsed.data;
  const now = Math.floor(Date.now() / 1000);

  // Delete all existing and re-insert (simple upsert pattern for D1)
  await db()
    .prepare("DELETE FROM listing_addon WHERE vanListingId = ?")
    .bind(id)
    .run();

  for (const item of items) {
    await db()
      .prepare(
        "INSERT INTO listing_addon (id, vanListingId, addonId, priceNZDCents) VALUES (?, ?, ?, ?)"
      )
      .bind(crypto.randomUUID(), id, item.addonId, item.priceNZDCents)
      .run();
  }

  void now; // suppress unused warning
  return NextResponse.json({ ok: true });
}
