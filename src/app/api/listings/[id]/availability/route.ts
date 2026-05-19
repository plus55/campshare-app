import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { AvailabilityBlock } from "@/lib/types";

const schema = z.object({
  startDate: z.number().int().positive(),
  endDate: z.number().int().positive(),
  reason: z.enum(["host-blocked", "maintenance"]),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const blocks = await db()
    .prepare(
      "SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC"
    )
    .bind(id)
    .all<AvailabilityBlock>();

  return NextResponse.json(blocks.results);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { startDate, endDate, reason } = parsed.data;
  if (endDate < startDate) return bad("endDate must be >= startDate");

  const blockId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      "INSERT INTO availability_block (id, vanListingId, startDate, endDate, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(blockId, id, startDate, endDate, reason, now)
    .run();

  return NextResponse.json({ id: blockId }, { status: 201 });
}
