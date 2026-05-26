import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { notificationHref, notificationLabel } from "@/lib/notification-display";

export const metadata: Metadata = {
  title: "Notifications — CampShare",
};

interface NotifRow {
  id: string;
  type: string;
  payload: string;
  readAt: number | null;
  createdAt: number;
}

function fmtDate(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "Pacific/Auckland",
  });
}

export default async function NotificationsPage() {
  const session = await requireSession();
  const uid = session.user.id;
  const database = await getDb();

  const { results } = await database
    .prepare(
      `SELECT id, type, payload, readAt, createdAt
       FROM notification
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 50`
    )
    .bind(uid)
    .all<NotifRow>();

  const items = (results ?? []).map((r) => ({
    ...r,
    parsedPayload: JSON.parse(r.payload) as Record<string, unknown>,
  }));

  const nowSec = Math.floor(Date.now() / 1000);
  await database
    .prepare("UPDATE notification SET readAt = ? WHERE userId = ? AND readAt IS NULL")
    .bind(nowSec, uid)
    .run();

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Notifications</h1>
        <p className="mb-6 text-muted-foreground">Your last 50 notifications.</p>

        {items.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-semibold text-foreground">Nothing here yet</p>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              Booking updates, review prompts, and messages will appear here.
            </p>
            <Link href="/vans" className="text-sm text-clay hover:text-clay-deep">Browse vans</Link>
          </div>
        ) : (
          <div className="surface-card overflow-hidden p-0">
            {items.map((n, i) => (
              <Link
                key={n.id}
                href={notificationHref(n.type, n.parsedPayload)}
                className={`block border-b border-border px-5 py-3.5 no-underline transition-colors last:border-b-0 hover:bg-muted ${
                  n.readAt === null ? "bg-clay/5" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-sm ${n.readAt === null ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                    {notificationLabel(n.type, n.parsedPayload)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(n.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
