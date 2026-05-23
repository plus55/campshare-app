import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { NORTH_ISLAND_REGIONS } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1).max(80),
  vanType: z.string().min(1),
  year: z.number().int().min(1970).max(new Date().getFullYear() + 1),
  sleeps: z.number().int().min(1),
  seats: z.number().int().min(1),
  fixedToilet: z.boolean().default(false),
  petFriendly: z.boolean().default(false),
  description: z.string().min(1),
  nightlyRate: z.number().int().positive(),
  minimumNights: z.number().int().positive(),
  instantBook: z.boolean().default(false),
  minDriverAge: z.number().int().min(18).max(99).default(18),
  region: z.string().min(1),
  features: z.array(z.string()).default([]),
  houseRules: z.string().default(""),
  pickupLocationText: z.string().max(120).optional(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function generateSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const profile = await db()
    .prepare("SELECT userId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ userId: string }>();
  if (!profile) return bad("Create a host profile before adding a listing", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const d = parsed.data;
  const island = NORTH_ISLAND_REGIONS.has(d.region) ? "North" : "South";
  const id = crypto.randomUUID();
  const slug = generateSlug(d.name, nanoid(6));
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `INSERT INTO van_listing
         (id, hostUserId, slug, name, vanType, year, sleeps, seats,
          fixedToilet, petFriendly, description, nightlyRate, minimumNights,
          instantBook, minDriverAge, status, region, island, features, houseRules,
          pickupLocationText, pickupLat, pickupLng, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, session.user.id, slug, d.name, d.vanType, d.year, d.sleeps, d.seats,
      d.fixedToilet ? 1 : 0, d.petFriendly ? 1 : 0, d.description,
      d.nightlyRate, d.minimumNights, d.instantBook ? 1 : 0, d.minDriverAge,
      d.region, island, JSON.stringify(d.features), d.houseRules,
      d.pickupLocationText ?? null, d.pickupLat ?? null, d.pickupLng ?? null,
      now, now
    )
    .run();

  return NextResponse.json({ id, slug, status: "draft" }, { status: 201 });
}
