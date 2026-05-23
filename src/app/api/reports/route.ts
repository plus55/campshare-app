import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  reportedUserId: z.string().min(1),
  reason: z.enum([
    "inappropriate_behaviour",
    "fraud",
    "no_show",
    "property_damage",
    "other",
  ]),
  details: z.string().max(2000).optional().nullable(),
  bookingId: z.string().optional().nullable(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { reportedUserId, reason, details, bookingId } = parsed.data;
  if (reportedUserId === session.user.id) return bad("Cannot report yourself");

  const reported = await db()
    .prepare("SELECT id FROM user WHERE id = ?")
    .bind(reportedUserId)
    .first<{ id: string }>();
  if (!reported) return bad("User not found", 404);

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `INSERT INTO user_report
         (id, reporterUserId, reportedUserId, reason, details, bookingId, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
    )
    .bind(id, session.user.id, reportedUserId, reason, details ?? null, bookingId ?? null, now)
    .run();

  return NextResponse.json({ id }, { status: 201 });
}
