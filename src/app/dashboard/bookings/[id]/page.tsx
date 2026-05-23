import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { BookingActions } from "@/components/BookingActions";
import { MessageSendForm } from "@/components/MessageSendForm";
import ReportButton from "@/components/ReportButton";
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
  guestName: string;
  guestEmail: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

export default async function DashboardBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const booking = await db()
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
      await db().prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?").bind(nowSec, id).run();
      booking.status = "expired";
    }
  }

  const [msgsResult, addonsResult, openDispute] = await Promise.all([
    db()
      .prepare(
        `SELECT bm.*, u.name AS senderName
         FROM booking_message bm
         JOIN user u ON u.id = bm.senderUserId
         WHERE bm.bookingId = ?
         ORDER BY bm.createdAt ASC`
      )
      .bind(id)
      .all<BookingMessage & { senderName: string }>(),
    db()
      .prepare("SELECT id, name, priceNZDCents FROM booking_addon WHERE bookingId = ?")
      .bind(id)
      .all<BookingAddon>(),
    db()
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
    <main className="cs-page">
      <div className="cs-container" style={{ maxWidth: 700 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>{booking.vanName}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="cs-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Check-in</p>
              <p style={{ margin: 0 }}>{fmtDate(booking.startDate)}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Check-out</p>
              <p style={{ margin: 0 }}>{fmtDate(booking.endDate)}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Duration</p>
              <p style={{ margin: 0 }}>{booking.nights} night{booking.nights !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Guest paid</p>
              <p style={{ margin: 0, fontWeight: 600 }}>${(booking.totalCents / 100).toFixed(0)} NZD</p>
              {booking.hostPayoutCents != null && (
                <p className="cs-muted cs-small" style={{ margin: 0 }}>
                  Your payout: ${(booking.hostPayoutCents / 100).toFixed(0)} NZD
                </p>
              )}
              {bookingAddons.map((a) => (
                <p key={a.id} className="cs-muted cs-small" style={{ margin: 0 }}>
                  + {a.name} (${(a.priceNZDCents / 100).toFixed(0)})
                </p>
              ))}
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Guest</p>
              <p style={{ margin: 0 }}>{booking.guestName}</p>
              <p className="cs-muted cs-small" style={{ margin: 0 }}>{booking.guestEmail}</p>
            </div>
            <div>
              <p className="cs-label" style={{ margin: 0 }}>Guests</p>
              <p style={{ margin: 0 }}>{booking.guestCount}</p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/vans/${booking.vanSlug}`} className="cs-btn cs-btn-ghost cs-small">
              View listing
            </Link>
            {canDispute && <DisputeForm bookingId={id} />}
            <span style={{ marginLeft: "auto" }}>
              <ReportButton reportedUserId={booking.guestUserId} reportedName={booking.guestName} bookingId={booking.id} />
            </span>
          </div>

          {openDispute && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fbe6e0", borderRadius: 8, fontSize: 13 }}>
              <strong>Dispute open</strong> — status: {openDispute.status}. CampShare admin will follow up.
            </div>
          )}
        </div>

        {booking.status === "requested" && (
          <div className="cs-card" style={{ marginTop: 16, background: "#fef3c7" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#92400e" }}>
              This request expires in 48 hours. Accept or decline to let the guest know.
            </p>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <BookingActions
            bookingId={id}
            status={booking.status}
            viewerRole="host"
          />
        </div>

        {/* Message thread */}
        <div className="cs-card" style={{ marginTop: 16 }}>
          <h2>Messages</h2>

          {booking.guestMessage && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                background: "var(--sand-200)", borderRadius: 10, padding: "10px 14px",
                maxWidth: "75%",
              }}>
                <p className="cs-small" style={{ margin: 0, color: "var(--ink-500)", fontWeight: 500 }}>
                  {booking.guestName} (with request)
                </p>
                <p style={{ margin: 0, marginTop: 4 }}>{booking.guestMessage}</p>
              </div>
            </div>
          )}

          {msgs.results.map((m) => {
            const isMine = m.senderUserId === session.user.id;
            return (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div style={{
                  background: isMine ? "var(--clay-100)" : "var(--sand-200)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  maxWidth: "75%",
                  marginLeft: isMine ? "auto" : 0,
                }}>
                  <p className="cs-small" style={{ margin: 0, color: "var(--ink-500)", fontWeight: 500 }}>
                    {isMine ? "You" : m.senderName}
                  </p>
                  <p style={{ margin: 0, marginTop: 4 }}>{m.body}</p>
                </div>
              </div>
            );
          })}

          {msgs.results.length === 0 && !booking.guestMessage && (
            <p className="cs-muted cs-small">No messages yet.</p>
          )}

          {isActive && <MessageSendForm bookingId={id} showTemplates />}
        </div>
      </div>
    </main>
  );
}
