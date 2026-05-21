import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  hostResponse: z.string().min(10, "Response must be at least 10 characters").max(1000),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const review = await db()
    .prepare(
      `SELECT r.id, r.subjectUserId, r.authorUserId, r.role, r.hostResponse,
              vl.name AS vanName
       FROM review r
       JOIN booking b ON b.id = r.bookingId
       JOIN van_listing vl ON vl.id = b.vanListingId
       WHERE r.id = ?`
    )
    .bind(id)
    .first<{
      id: string;
      subjectUserId: string;
      authorUserId: string;
      role: string;
      hostResponse: string | null;
      vanName: string;
    }>();

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the review subject (host) can respond to a guest review
  if (review.role !== "guest") {
    return NextResponse.json({ error: "Only guest reviews can receive a host response" }, { status: 400 });
  }
  if (review.subjectUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (review.hostResponse) {
    return NextResponse.json({ error: "A response has already been posted" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  await db()
    .prepare("UPDATE review SET hostResponse = ?, hostRespondedAt = ? WHERE id = ?")
    .bind(parsed.data.hostResponse, nowSec, id)
    .run();

  // Notify the original reviewer (guest) that the host responded
  await createNotification({
    userId: review.authorUserId,
    type: "host_response",
    payload: { reviewId: id, vanName: review.vanName },
  });

  return NextResponse.json({ ok: true });
}
