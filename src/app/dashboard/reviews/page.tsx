import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { HOLDBACK_SEC, BLIND_WINDOW_SEC } from "@/lib/reviews";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReceivedReviewsSection from "./ReceivedReviewsSection";

export const metadata: Metadata = {
  title: "Reviews — CampShare",
};

interface ReceivedReview {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  createdAt: number;
  vanName: string;
  hostResponse: string | null;
  hostRespondedAt: number | null;
}

interface PendingTrip {
  bookingId: string;
  role: "guest" | "host";
  vanName: string;
  startDate: number;
  endDate: number;
  counterpartName: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland",
  });
}

export default async function ReviewsDashboardPage() {
  const session = await requireSession();
  const uid = session.user.id;
  const database = await getDb();

  const ns = Math.floor(Date.now() / 1000);
  const visibilityCutoff = HOLDBACK_SEC + BLIND_WINDOW_SEC;

  const [pendingResult, receivedResult] = await Promise.all([
    database
      .prepare(
        `SELECT
           b.id AS bookingId,
           CASE WHEN b.guestUserId = ? THEN 'guest' ELSE 'host' END AS role,
           vl.name AS vanName,
           b.startDate,
           b.endDate,
           CASE WHEN b.guestUserId = ? THEN hp.firstName ELSE ug.name END AS counterpartName
         FROM booking b
         JOIN van_listing vl ON vl.id = b.vanListingId
         JOIN host_profile hp ON hp.userId = b.hostUserId
         JOIN user ug ON ug.id = b.guestUserId
         WHERE b.status = 'completed'
           AND (b.guestUserId = ? OR b.hostUserId = ?)
           AND NOT EXISTS (
             SELECT 1 FROM review r
             WHERE r.bookingId = b.id AND r.authorUserId = ?
           )
           AND (b.endDate / 1000 + 1296000) >= unixepoch()
         ORDER BY b.endDate DESC`
      )
      .bind(uid, uid, uid, uid, uid)
      .all<PendingTrip>(),

    database
      .prepare(
        `SELECT r.id, r.rating, r.text, r.createdAt, r.hostResponse, r.hostRespondedAt,
                u.name AS authorName, vl.name AS vanName
         FROM review r
         JOIN booking b ON b.id = r.bookingId
         JOIN user u ON u.id = r.authorUserId
         JOIN van_listing vl ON vl.id = b.vanListingId
         WHERE r.role = 'guest'
           AND r.subjectUserId = ?
           AND (
             EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
             OR (b.endDate / 1000 + ?) <= ?
           )
         ORDER BY r.createdAt DESC
         LIMIT 30`
      )
      .bind(uid, visibilityCutoff, ns)
      .all<ReceivedReview>(),
  ]);

  const pending = pendingResult.results ?? [];
  const received = receivedResult.results ?? [];

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Reviews</h1>
        <p className="mb-6 text-muted-foreground">
          Trips you can still review. Reviews are double-blind — both sides write in private and both go live together (or after 14 days).
        </p>

        {pending.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-semibold text-foreground">No reviews waiting</p>
            <p className="max-w-[40ch] text-sm text-muted-foreground">
              We&apos;ll email you when a trip wraps up and is ready for review.
            </p>
            <Link href="/vans" className={cn(buttonVariants())}>Browse vans</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <div key={t.bookingId} className="surface-card flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{t.vanName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.role === "guest" ? `Hosted by ${t.counterpartName}` : `Guest: ${t.counterpartName}`} ·{" "}
                    {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                  </div>
                </div>
                <Link
                  href={`/trips/${t.bookingId}/review`}
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
                >
                  Leave a review
                </Link>
              </div>
            ))}
          </div>
        )}

        <ReceivedReviewsSection reviews={received} />
      </div>
    </main>
  );
}
