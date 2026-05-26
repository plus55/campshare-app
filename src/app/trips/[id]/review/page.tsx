import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import ReviewForm from "./ReviewForm";
import type { Booking, ReviewRole } from "@/lib/types";

interface ReviewableBooking extends Booking {
  vanName: string;
  vanSlug: string;
}

export default async function LeaveReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/trips/${id}/review`);

  const database = await getDb();

  const booking = await database
    .prepare(
      `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       WHERE b.id = ?`
    )
    .bind(id)
    .first<ReviewableBooking>();

  if (!booking) notFound();

  const isGuest = booking.guestUserId === session.user.id;
  const isHost = booking.hostUserId === session.user.id;
  if (!isGuest && !isHost) notFound();

  if (booking.status !== "completed") {
    redirect(`/trips/${id}`);
  }

  const role: ReviewRole = isGuest ? "guest" : "host";
  const returnHref = isGuest ? `/trips/${id}?reviewed=1` : "/dashboard/reviews";
  const backHref = isGuest ? `/trips/${id}` : "/dashboard/reviews";
  const existing = await database
    .prepare("SELECT id FROM review WHERE bookingId = ? AND role = ?")
    .bind(id, role)
    .first<{ id: string }>();

  if (existing) {
    redirect(returnHref);
  }

  const subjectLabel = isGuest ? "your trip" : "your guest";

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[640px]">
        <Link
          href={backHref}
          className="mb-3 inline-block text-sm text-stone hover:text-charcoal"
        >
          ← Back to trip
        </Link>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">
          How was {subjectLabel}?
        </h1>
        <p className="mb-6 text-stone">
          Reviewing <strong className="text-charcoal">{booking.vanName}</strong>.
          Reviews stay hidden until both sides submit, or after 14 days — whichever comes first.
        </p>
        <ReviewForm bookingId={id} role={role} vanName={booking.vanName} returnHref={returnHref} />
      </div>
    </main>
  );
}
