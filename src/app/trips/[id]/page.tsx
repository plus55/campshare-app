import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { BookingActions } from "@/components/BookingActions";
import { MessageSendForm } from "@/components/MessageSendForm";
import DateChangeForm from "./DateChangeForm";
import DisputeForm from "@/components/DisputeForm";
import type { Booking, BookingMessage } from "@/lib/types";

const DISPUTE_WINDOW_SEC = 7 * 24 * 3600;

interface BookingAddon {
  id: string;
  name: string;
  priceNZDCents: number;
}

interface BookingDetail extends Booking {
  vanName: string;
  vanSlug: string;
  hostFirstName: string | null;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

const detailLabel = "text-[11px] font-medium uppercase tracking-wide text-stone";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const database = await getDb();

  const booking = await database
    .prepare(
      `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
              hp.firstName AS hostFirstName
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       LEFT JOIN host_profile hp ON hp.userId = b.hostUserId
       WHERE b.id = ?`
    )
    .bind(id)
    .first<BookingDetail>();

  if (!booking) notFound();
  if (booking.guestUserId !== session.user.id) notFound();

  // Lazy expiry
  if (booking.status === "requested") {
    const nowSec = Math.floor(Date.now() / 1000);
    if (booking.expiresAt < nowSec) {
      await database.prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?").bind(nowSec, id).run();
      booking.status = "expired";
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

  const isActive = ["requested", "accepted", "in_progress"].includes(booking.status);

  const nowSec = Math.floor(Date.now() / 1000);
  const anchorSec = booking.completedAt ?? Math.floor(booking.endDate / 1000);
  const canDispute = booking.status === "completed" && !openDispute && nowSec - anchorSec < DISPUTE_WINDOW_SEC;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[700px]">
        <p className="mb-2 text-sm">
          <Link href="/trips" className="text-stone hover:text-charcoal">← My trips</Link>
        </p>

        <div className="mb-4 flex items-center gap-3">
          <h1 className="m-0 font-serif text-3xl text-forest-deep">{booking.vanName}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        {/* Booking details card */}
        <div className="rounded-2xl border border-line bg-cream p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={detailLabel}>Check-in</p>
              <p className="mt-0.5 text-sm text-charcoal">{fmtDate(booking.startDate)}</p>
            </div>
            <div>
              <p className={detailLabel}>Check-out</p>
              <p className="mt-0.5 text-sm text-charcoal">{fmtDate(booking.endDate)}</p>
            </div>
            <div>
              <p className={detailLabel}>Duration</p>
              <p className="mt-0.5 text-sm text-charcoal">{booking.nights} night{booking.nights !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className={detailLabel}>Total paid</p>
              <p className="mt-0.5 text-sm font-semibold text-charcoal">${(booking.totalCents / 100).toFixed(0)} NZD</p>
              {booking.serviceFeeCents != null && (
                <p className="text-xs text-stone">incl. ${((booking.serviceFeeCents + (booking.gstOnFeeCents ?? 0)) / 100).toFixed(0)} service fee</p>
              )}
              {bookingAddons.map((a) => (
                <p key={a.id} className="text-xs text-stone">+ {a.name} (${(a.priceNZDCents / 100).toFixed(0)})</p>
              ))}
            </div>
            <div>
              <p className={detailLabel}>Guests</p>
              <p className="mt-0.5 text-sm text-charcoal">{booking.guestCount}</p>
            </div>
            <div>
              <p className={detailLabel}>Host</p>
              <p className="mt-0.5 text-sm text-charcoal">{booking.hostFirstName ?? "—"}</p>
            </div>
          </div>

          {booking.statusReason && (
            <p className="mt-3 text-sm text-stone">
              <strong className="text-charcoal">Note:</strong> {booking.statusReason}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/vans/${booking.vanSlug}`} className="rounded-lg border border-line px-3 py-1.5 text-sm text-charcoal-soft hover:bg-sand transition-colors">
              View listing ↗
            </Link>
            {["accepted", "requested"].includes(booking.status) && (
              <DateChangeForm
                bookingId={id}
                currentStartDate={booking.startDate}
                currentEndDate={booking.endDate}
              />
            )}
            {canDispute && <DisputeForm bookingId={id} />}
          </div>

          {openDispute && (
            <div className="mt-3 rounded-lg bg-rust-light px-3 py-2 text-sm text-rust">
              <strong>Dispute open</strong> — status: {openDispute.status}. CampShare admin will follow up.
            </div>
          )}
        </div>

        {booking.status === "requested" && (
          <div className="mt-4 rounded-2xl border border-ochre bg-[#fef3c7] px-4 py-3 text-sm text-[#92400e]">
            Waiting for the host to respond. Requests expire after 48 hours.
          </div>
        )}

        <div className="mt-4">
          <BookingActions bookingId={id} status={booking.status} viewerRole="guest" />
        </div>

        {/* Message thread */}
        <div className="mt-4 rounded-2xl border border-line bg-cream p-6">
          <h2 className="mb-4 font-serif text-xl text-forest-deep">Messages</h2>

          {booking.guestMessage && (
            <div className="mb-3">
              <div className="ml-auto max-w-[75%] rounded-xl bg-clay-light px-4 py-2.5">
                <p className="text-xs font-medium text-clay-deep">Your initial message</p>
                <p className="mt-1 text-sm text-charcoal">{booking.guestMessage}</p>
              </div>
            </div>
          )}

          {msgs.results.map((m) => {
            const isMine = m.senderUserId === session.user.id;
            return (
              <div key={m.id} className="mb-3">
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isMine ? "ml-auto bg-clay-light" : "bg-sand-warm"}`}>
                  <p className="text-xs font-medium text-stone">{isMine ? "You" : m.senderName}</p>
                  <p className="mt-1 text-sm text-charcoal">{m.body}</p>
                </div>
              </div>
            );
          })}

          {msgs.results.length === 0 && !booking.guestMessage && (
            <p className="text-sm text-stone">No messages yet.</p>
          )}

          {isActive && <MessageSendForm bookingId={id} />}
        </div>
      </div>
    </main>
  );
}
