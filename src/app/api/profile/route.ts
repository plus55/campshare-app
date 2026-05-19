import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { NORTH_ISLAND_REGIONS } from "@/lib/constants";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  bio: z.string().optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { firstName, lastName, phone, region, bio } = parsed.data;
  const island = NORTH_ISLAND_REGIONS.has(region) ? "North" : "South";
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `INSERT INTO host_profile (userId, firstName, lastName, phone, region, island, bio, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         firstName = excluded.firstName,
         lastName  = excluded.lastName,
         phone     = excluded.phone,
         region    = excluded.region,
         island    = excluded.island,
         bio       = excluded.bio,
         updatedAt = excluded.updatedAt`
    )
    .bind(session.user.id, firstName, lastName, phone, region, island, bio ?? null, now, now)
    .run();

  return NextResponse.json({ ok: true });
}
