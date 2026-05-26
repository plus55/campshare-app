"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationHref, notificationLabel } from "@/lib/notification-display";

interface NotifItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: number | null;
  createdAt: number;
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
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [markReadError, setMarkReadError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const markingReadRef = useRef(false);

  async function loadNotifications() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) throw new Error("notification request failed");
      const data = await res.json() as { items?: unknown };
      if (!Array.isArray(data.items)) throw new Error("invalid notification response");
      setItems(data.items as NotifItem[]);
      fetchedRef.current = true;
    } catch {
      setLoadError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationsRead() {
    if (markingReadRef.current) return;
    markingReadRef.current = true;
    setMarkReadError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("mark read request failed");
      setUnread(0);
    } catch {
      markingReadRef.current = false;
      setMarkReadError("Could not mark notifications as read.");
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !fetchedRef.current) {
      void loadNotifications();
    }
    if (next && unread > 0) {
      void markNotificationsRead();
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
          {markReadError && (
            <p role="alert" aria-live="polite" className="m-0 border-b border-border bg-destructive/10 px-[14px] py-2 text-xs text-destructive">
              {markReadError}
            </p>
          )}
          {loadError ? (
            <div role="alert" aria-live="polite" className="flex flex-col items-center gap-2 px-[14px] py-5 text-center text-[0.85rem] text-destructive">
              <p className="m-0">{loadError}</p>
              <button
                type="button"
                className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-clay focus-visible:outline-offset-2"
                onClick={() => void loadNotifications()}
              >
                Try again
              </button>
            </div>
          ) : loading || items === null ? (
            <p className="px-[14px] py-5 text-[0.85rem] text-muted-foreground text-center m-0">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-[14px] py-5 text-[0.85rem] text-muted-foreground text-center m-0">No notifications yet</p>
          ) : (
            items.slice(0, 8).map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n.type, n.payload)}
                className={`block px-[14px] py-[10px] border-b border-border last:border-0 no-underline text-foreground hover:bg-muted transition-colors ${n.readAt === null ? "bg-clay/5" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="block text-[0.85rem] leading-[1.4]">{notificationLabel(n.type, n.payload)}</span>
                <span className="block text-[0.75rem] text-muted-foreground mt-[2px]">{relTime(n.createdAt)}</span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
