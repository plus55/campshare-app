"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const fetchedRef = useRef(false);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && !fetchedRef.current) {
      fetchedRef.current = true;
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json() as { items: NotifItem[] };
      setItems(data.items);
    }
    if (next && unread > 0) {
      setUnread(0);
      fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className="relative inline-flex items-center justify-center size-8 rounded-lg text-foreground hover:bg-muted transition-colors border-0 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-clay focus-visible:outline-offset-2"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-[2px] right-[2px] min-w-[16px] h-4 bg-clay text-cream text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] pointer-events-none"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[300px] p-0 bg-card border-border shadow-[0_18px_50px_-12px_rgba(31,42,32,0.18)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-[14px] py-3 border-b border-border">
          <strong className="font-serif text-[0.9rem] text-forest-deep dark:text-cream">Notifications</strong>
          <Link
            href="/dashboard/notifications"
            className="text-[12px] text-clay hover:text-clay-deep"
            onClick={() => setOpen(false)}
          >
            See all
          </Link>
        </div>

        <div className="flex flex-col max-h-[360px] overflow-y-auto">
          {items === null ? (
            <p className="px-[14px] py-5 text-[0.85rem] text-muted-foreground text-center m-0">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-[14px] py-5 text-[0.85rem] text-muted-foreground text-center m-0">No notifications yet</p>
          ) : (
            items.slice(0, 8).map((n) => (
              <Link
                key={n.id}
                href={notifHref(n.type, n.payload)}
                className={`block px-[14px] py-[10px] border-b border-border last:border-0 no-underline text-foreground hover:bg-muted transition-colors ${n.readAt === null ? "bg-clay/5" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="block text-[0.85rem] leading-[1.4]">{notifLabel(n.type, n.payload)}</span>
                <span className="block text-[0.75rem] text-muted-foreground mt-[2px]">{relTime(n.createdAt)}</span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
