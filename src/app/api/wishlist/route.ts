import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();

  const { results } = await db()
    .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
    .bind(session.user.id)
    .all<{ vanListingId: string }>();

  return NextResponse.json({ ids: results.map((r) => r.vanListingId) });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { vanListingId } = await req.json() as { vanListingId: string };

  if (!vanListingId) {
    return NextResponse.json({ error: "vanListingId required" }, { status: 400 });
  }

  await db()
    .prepare("INSERT OR IGNORE INTO wishlist (userId, vanListingId, createdAt) VALUES (?, ?, ?)")
    .bind(session.user.id, vanListingId, Date.now())
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const vanListingId = new URL(req.url).searchParams.get("vanListingId");

  if (!vanListingId) {
    return NextResponse.json({ error: "vanListingId required" }, { status: 400 });
  }

  await db()
    .prepare("DELETE FROM wishlist WHERE userId = ? AND vanListingId = ?")
    .bind(session.user.id, vanListingId)
    .run();

  return NextResponse.json({ ok: true });
}
