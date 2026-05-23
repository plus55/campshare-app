import { getDb } from "./db";

export type BadgeKind = "super_host" | "responds_reliably" | "verified";

export interface Badge {
  kind: BadgeKind;
  label: string;
  description: string;
}

const BADGE_META: Record<BadgeKind, { label: string; description: string }> = {
  super_host: {
    label: "Super Host",
    description: "10+ completed bookings, 4.8+ rating, 95%+ completion, fast responses",
  },
  responds_reliably: {
    label: "Responds reliably",
    description: "Usually replies within 2 hours",
  },
  verified: {
    label: "Verified",
    description: "Identity confirmed by Stripe Identity",
  },
};

interface HostStatsRow {
  completedCount: number;
  hostCancelCount: number;
  avgRating: number | null;
  totalForRating: number;
}

interface ResponseTimeRow {
  avgFirstReplySec: number | null;
  threadCount: number;
}

export async function getBadgesForHost(userId: string): Promise<Badge[]> {
  const database = await getDb();
  const badges: Badge[] = [];

  const userRow = await database
    .prepare("SELECT kycStatus FROM user WHERE id = ?")
    .bind(userId)
    .first<{ kycStatus: string }>();
  if (userRow?.kycStatus === "verified") {
    badges.push({ kind: "verified", ...BADGE_META.verified });
  }

  const stats = await database
    .prepare(
      `SELECT
         SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
         SUM(CASE WHEN b.status = 'cancelled_by_host' THEN 1 ELSE 0 END) AS hostCancelCount,
         AVG(CASE
               WHEN r.role = 'guest'
                 AND (EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
                      OR (b.endDate / 1000 + 1296000) <= unixepoch())
               THEN r.rating
               ELSE NULL
             END) AS avgRating,
         COUNT(CASE
                 WHEN r.role = 'guest'
                   AND (EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
                        OR (b.endDate / 1000 + 1296000) <= unixepoch())
                 THEN 1
                 ELSE NULL
               END) AS totalForRating
       FROM booking b
       LEFT JOIN review r ON r.bookingId = b.id
       WHERE b.hostUserId = ?`
    )
    .bind(userId)
    .first<HostStatsRow>();

  const completed = stats?.completedCount ?? 0;
  const hostCancels = stats?.hostCancelCount ?? 0;
  const avgRating = stats?.avgRating ?? null;
  const ratingCount = stats?.totalForRating ?? 0;
  const completionRate = completed + hostCancels > 0 ? completed / (completed + hostCancels) : 1;

  const resp = await database
    .prepare(
      `SELECT
         AVG(firstReply.firstReplyAt - b.requestedAt) AS avgFirstReplySec,
         COUNT(*) AS threadCount
       FROM booking b
       JOIN (
         SELECT bm.bookingId, MIN(bm.createdAt) AS firstReplyAt
         FROM booking_message bm
         JOIN booking bb ON bb.id = bm.bookingId
         WHERE bm.senderUserId = bb.hostUserId
         GROUP BY bm.bookingId
       ) firstReply ON firstReply.bookingId = b.id
       WHERE b.hostUserId = ?
       ORDER BY b.requestedAt DESC
       LIMIT 20`
    )
    .bind(userId)
    .first<ResponseTimeRow>();

  const avgReplySec = resp?.avgFirstReplySec ?? null;
  const threadCount = resp?.threadCount ?? 0;

  if (threadCount >= 5 && avgReplySec !== null && avgReplySec < 2 * 3600) {
    badges.push({ kind: "responds_reliably", ...BADGE_META.responds_reliably });
  }

  if (
    completed >= 10 &&
    avgRating !== null &&
    avgRating >= 4.8 &&
    ratingCount >= 5 &&
    completionRate >= 0.95 &&
    threadCount >= 5 &&
    avgReplySec !== null &&
    avgReplySec < 24 * 3600
  ) {
    badges.push({ kind: "super_host", ...BADGE_META.super_host });
  }

  return badges;
}

export async function getInstantBookEligibleHosts(hostUserIds: string[]): Promise<Set<string>> {
  if (hostUserIds.length === 0) return new Set();
  const database = await getDb();
  const placeholders = hostUserIds.map(() => "?").join(", ");
  const { results } = await database
    .prepare(
      `SELECT u.id
       FROM user u
       LEFT JOIN booking b ON b.hostUserId = u.id AND b.status = 'completed'
       LEFT JOIN review r ON r.bookingId = b.id
         AND r.role = 'guest'
         AND (EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
              OR (b.endDate / 1000 + 1296000) <= unixepoch())
       WHERE u.id IN (${placeholders})
         AND u.kycStatus = 'verified'
       GROUP BY u.id
       HAVING COUNT(DISTINCT b.id) >= 3
          AND COUNT(r.rating) >= 3
          AND AVG(r.rating) >= 4.5`
    )
    .bind(...hostUserIds)
    .all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

export async function isInstantBookEligible(hostUserId: string): Promise<boolean> {
  const eligible = await getInstantBookEligibleHosts([hostUserId]);
  return eligible.has(hostUserId);
}
