import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { NORTH_ISLAND_REGIONS } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  vanType: z.string().min(1).optional(),
  year: z.number().int().min(1970).max(new Date().getFullYear() + 1).optional(),
  sleeps: z.number().int().min(1).optional(),
  seats: z.number().int().min(1).optional(),
  fixedToilet: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  description: z.string().min(1).optional(),
  nightlyRate: z.number().int().positive().optional(),
  minimumNights: z.number().int().positive().optional(),
  instantBook: z.boolean().optional(),
  region: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  houseRules: z.string().optional(),
  status: z.enum(["draft", "paused", "archived"]).optional(),
  pickupLocationText: z.string().max(120).optional(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id, hostUserId, status FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string; hostUserId: string; status: string }>();
  if (!listing) return bad("Not found", 404);

  if (listing.status === "pending_review") {
    return bad("Cannot edit a listing that is under review. Withdraw it first.");
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const d = parsed.data;
  const now = Math.floor(Date.now() / 1000);

  const sets: string[] = ["updatedAt = ?"];
  const binds: unknown[] = [now];

  if (d.name !== undefined) { sets.push("name = ?"); binds.push(d.name); }
  if (d.vanType !== undefined) { sets.push("vanType = ?"); binds.push(d.vanType); }
  if (d.year !== undefined) { sets.push("year = ?"); binds.push(d.year); }
  if (d.sleeps !== undefined) { sets.push("sleeps = ?"); binds.push(d.sleeps); }
  if (d.seats !== undefined) { sets.push("seats = ?"); binds.push(d.seats); }
  if (d.fixedToilet !== undefined) { sets.push("fixedToilet = ?"); binds.push(d.fixedToilet ? 1 : 0); }
  if (d.petFriendly !== undefined) { sets.push("petFriendly = ?"); binds.push(d.petFriendly ? 1 : 0); }
  if (d.description !== undefined) { sets.push("description = ?"); binds.push(d.description); }
  if (d.nightlyRate !== undefined) { sets.push("nightlyRate = ?"); binds.push(d.nightlyRate); }
  if (d.minimumNights !== undefined) { sets.push("minimumNights = ?"); binds.push(d.minimumNights); }
  if (d.instantBook !== undefined) { sets.push("instantBook = ?"); binds.push(d.instantBook ? 1 : 0); }
  if (d.region !== undefined) {
    sets.push("region = ?"); binds.push(d.region);
    sets.push("island = ?"); binds.push(NORTH_ISLAND_REGIONS.has(d.region) ? "North" : "South");
  }
  if (d.features !== undefined) { sets.push("features = ?"); binds.push(JSON.stringify(d.features)); }
  if (d.houseRules !== undefined) { sets.push("houseRules = ?"); binds.push(d.houseRules); }
  if (d.status !== undefined) { sets.push("status = ?"); binds.push(d.status); }
  if (d.pickupLocationText !== undefined) { sets.push("pickupLocationText = ?"); binds.push(d.pickupLocationText); }
  if (d.pickupLat !== undefined) { sets.push("pickupLat = ?"); binds.push(d.pickupLat); }
  if (d.pickupLng !== undefined) { sets.push("pickupLng = ?"); binds.push(d.pickupLng); }

  binds.push(id);

  await db()
    .prepare(`UPDATE van_listing SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  return NextResponse.json({ ok: true });
}
