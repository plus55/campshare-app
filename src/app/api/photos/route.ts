import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { VanPhoto } from "@/lib/types";

const schema = z.object({
  vanListingId: z.string().min(1),
  r2Key: z.string().min(1),
  position: z.number().int().min(0).default(0),
  caption: z.string().optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { vanListingId, r2Key, position, caption } = parsed.data;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(vanListingId, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Listing not found or not yours", 404);

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      "INSERT INTO van_photo (id, vanListingId, r2Key, position, caption, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, vanListingId, r2Key, position, caption ?? null, now)
    .run();

  const photo: VanPhoto = { id, vanListingId, r2Key, position, caption: caption ?? null, createdAt: now };
  return NextResponse.json(photo, { status: 201 });
}
