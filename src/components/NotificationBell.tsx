"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface NotifItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: number | null;
  createdAt: number;
}

function notifLabel(type: string, payload: Record<string, unknown>): string {
  const van = (payload.vanName as string) ?? "your van";
  switch (type) {
    case "booking_requested":  return `New booking request for ${van}`;
    case "booking_accepted":   return `Your booking for ${van} was accepted`;
    case "booking_declined":   return `Booking request for ${van} was declined`;
    case "booking_cancelled":  return `Booking for ${van} was cancelled`;
    case "review_prompt":      return `Time to review your trip in ${van}`;
    case "review_received":    return `New review for ${van}`;
    case "host_response":      return `Your host replied to your review for ${van}`;
    case "message":            return `New message about ${van}`;
    case "payout_sent":        return `Payout sent for ${van}`;
    case "deposit_released":   return `Deposit released for ${van}`;
    default:                   return "New notification";
  }
}

function notifHref(type: string, payload: Record<string, unknown>): string {
  const bookingId = payload.bookingId as string | undefined;
  switch (type) {
    case "booking_requested":
    case "booking_accepted":
    case "booking_declined":
    case "booking_cancelled":
    case "message":
      return bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings";
    case "review_prompt":
      return bookingId ? `/trips/${bookingId}/review` : "/dashboard/reviews";
    case "review_received":
    case "host_response":
      return "/dashboard/reviews";
    case "payout_sent":
      return "/dashboard/payouts";
    case "deposit_released":
      return bookingId ? `/trips/${bookingId}` : "/trips";
    default:
      return "/dashboard/notifications";
  }
}

function relTime(sec: number): string {
  const diff = Math.floor(Date.now() / 1000 - sec);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (items === null) {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json() as { items: NotifItem[] };
      setItems(data.items);
    }
    if (unread > 0) {
      setUnread(0);
      fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
    }
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="notif-bell-btn"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-panel-header">
            <strong>Notifications</strong>
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)} style={{ fontSize: 12, color: "var(--clay)" }}>
              See all
            </Link>
          </div>

          {items === null ? (
            <div className="notif-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            items.slice(0, 8).map((n) => (
              <Link
                key={n.id}
                href={notifHref(n.type, n.payload)}
                role="menuitem"
                className={`notif-item${n.readAt === null ? " notif-item--unread" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="notif-item-text">{notifLabel(n.type, n.payload)}</span>
                <span className="notif-item-time">{relTime(n.createdAt)}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
