import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { BookingActions } from "@/components/BookingActions";
import { MessageSendForm } from "@/components/MessageSendForm";
import ReportButton from "@/components/ReportButton";
import DisputeForm from "@/components/DisputeForm";
import type { Booking, BookingMessage } from "@/lib/types";
import { expireBookingRequest } from "@/lib/booking-expiry";
import { canMessageOnBooking } from "@/lib/booking-status";
import { fmtNzd } from "@/lib/money";

const DISPUTE_WINDOW_SEC = 7 * 24 * 3600;

interface BookingAddon {
  id: string;
  name: string;
  priceNZDCents: number;
}

interface BookingDetail extends Booking {
  vanName: string;
  vanSlug: string;
  guestName: string;
  guestEmail: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

const detailLabel = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export default async function DashboardBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const database = await getDb();

  const booking = await database
    .prepare(
      `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
              u.name AS guestName, u.email AS guestEmail
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       JOIN user u ON u.id = b.guestUserId
       WHERE b.id = ? AND b.hostUserId = ?`
    )
    .bind(id, session.user.id)
    .first<BookingDetail>();

  if (!booking) notFound();

  // Lazy expiry
  if (booking.status === "requested") {
    const nowSec = Math.floor(Date.now() / 1000);
    if (booking.expiresAt < nowSec) {
      if (await expireBookingRequest(booking, nowSec)) booking.status = "expired";
    }
  }

  const [msgsResult, addonsResult, openDispute] = await Promise.all([
    database
      .prepare(
        `SELECT bm.*, u.name AS senderName
         FROM booking_message bm
         JOIN user u ON u.id = bm.senderUserId
         WHERE bm.bookingId = ?
         ORDER BY bm.createdAt ASC`
      )
      .bind(id)
      .all<BookingMessage & { senderName: string }>(),
    database
      .prepare("SELECT id, name, priceNZDCents FROM booking_addon WHERE bookingId = ?")
      .bind(id)
      .all<BookingAddon>(),
    database
      .prepare(
        `SELECT id, status, reason, createdAt FROM dispute
         WHERE bookingId = ? AND initiatorUserId = ?
         ORDER BY createdAt DESC LIMIT 1`
      )
      .bind(id, session.user.id)
      .first<{ id: string; status: string; reason: string; createdAt: number }>(),
  ]);
  const msgs = msgsResult;
  const bookingAddons = addonsResult.results;

  const nowSec = Math.floor(Date.now() / 1000);
  await database.batch([
    database
      .prepare("UPDATE booking_message SET readAt = ? WHERE bookingId = ? AND senderUserId != ? AND readAt IS NULL")
      .bind(nowSec, id, session.user.id),
    database
      .prepare("UPDATE notification SET readAt = ? WHERE userId = ? AND type = 'message' AND readAt IS NULL AND json_extract(payload, '$.bookingId') = ?")
      .bind(nowSec, session.user.id, id),
  ]);

  const isMessageable = canMessageOnBooking(booking.status);

  const anchorSec = booking.completedAt ?? Math.floor(booking.endDate / 1000);
  const canDispute = booking.status === "completed" && !openDispute && nowSec - anchorSec < DISPUTE_WINDOW_SEC;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[700px]">
        <p className="mb-2 text-sm">
          <Link href="/dashboard/bookings" className="text-muted-foreground hover:text-foreground">← Bookings</Link>
        </p>

        <div className="mb-4 flex items-center gap-3">
          <h1 className="m-0 font-serif text-3xl text-forest-deep dark:text-cream">{booking.vanName}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Booking details card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={detailLabel}>Check-in</p>
              <p className="mt-0.5 text-sm text-foreground">{fmtDate(booking.startDate)}</p>
            </div>
            <div>
              <p className={detailLabel}>Check-out</p>
              <p className="mt-0.5 text-sm text-foreground">{fmtDate(booking.endDate)}</p>
            </div>
            <div>
              <p className={detailLabel}>Duration</p>
              <p className="mt-0.5 text-sm text-foreground">{booking.nights} night{booking.nights !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className={detailLabel}>Guest paid</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{fmtNzd(booking.totalCents)} NZD</p>
              {booking.hostPayoutCents != null && (
                <p className="text-xs text-muted-foreground">Your payout: {fmtNzd(booking.hostPayoutCents)} NZD</p>
              )}
              {bookingAddons.map((a) => (
                <p key={a.id} className="text-xs text-muted-foreground">+ {a.name} ({fmtNzd(a.priceNZDCents)})</p>
              ))}
            </div>
            <div>
              <p className={detailLabel}>Guest</p>
              <p className="mt-0.5 text-sm text-foreground">{booking.guestName}</p>
              <p className="text-xs text-muted-foreground">{booking.guestEmail}</p>
            </div>
            <div>
              <p className={detailLabel}>Guests</p>
              <p className="mt-0.5 text-sm text-foreground">{booking.guestCount}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={`/vans/${booking.vanSlug}`} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
              View listing ↗
            </Link>
            {canDispute && <DisputeForm bookingId={id} />}
            <span className="ml-auto">
              <ReportButton reportedUserId={booking.guestUserId} reportedName={booking.guestName} bookingId={booking.id} />
            </span>
          </div>

          {openDispute && (
            <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <strong>Dispute open</strong> — status: {openDispute.status}. CampShare admin will follow up.
            </div>
          )}
        </div>

        {booking.status === "requested" && (
          <div className="mt-4 rounded-2xl border border-ochre/40 bg-ochre/5 px-4 py-3 text-sm text-ochre">
            This request expires in 48 hours. Accept or decline to let the guest know.
          </div>
        )}

        <div className="mt-4">
          <BookingActions bookingId={id} status={booking.status} viewerRole="host" />
        </div>

        {/* Message thread */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl text-forest-deep dark:text-cream">Messages</h2>

          {booking.guestMessage && (
            <div className="mb-3">
              <div className="ml-auto max-w-[75%] rounded-xl bg-clay/10 px-4 py-2.5">
                <p className="text-xs font-medium text-clay">{booking.guestName} (with request)</p>
                <p className="mt-1 text-sm text-foreground">{booking.guestMessage}</p>
              </div>
            </div>
          )}

          {msgs.results.map((m) => {
            const isMine = m.senderUserId === session.user.id;
            return (
              <div key={m.id} className="mb-3">
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMine ? "ml-auto bg-clay/10" : "bg-muted"}`}>
                  <p className="text-xs font-medium text-muted-foreground">{isMine ? "You" : m.senderName}</p>
                  <p className="mt-1 text-sm text-foreground">{m.body}</p>
                </div>
              </div>
            );
          })}

          {msgs.results.length === 0 && !booking.guestMessage && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}

          {isMessageable && <MessageSendForm bookingId={id} showTemplates />}
        </div>
      </div>
    </main>
  );
}
