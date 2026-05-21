import { db } from "./db";

const HOLDBACK_SEC = 24 * 60 * 60;
const BLIND_WINDOW_SEC = 14 * 24 * 60 * 60;

export type ReviewRole = "guest" | "host";

export interface ReviewItem {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  createdAt: number;
  hostResponse: string | null;
  hostRespondedAt: number | null;
}

export interface ReviewSummary {
  avgRating: number | null;
  reviewCount: number;
  items: ReviewItem[];
}

export interface ReviewVisibility {
  guestReviewVisible: boolean;
  hostReviewVisible: boolean;
  windowOpenedAt: number;
  windowClosedAt: number;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function windowOpenedAtSec(endDateMs: number): number {
  return Math.floor(endDateMs / 1000) + HOLDBACK_SEC;
}

export async function getReviewVisibility(bookingId: string): Promise<ReviewVisibility | null> {
  const booking = await db()
    .prepare("SELECT endDate FROM booking WHERE id = ?")
    .bind(bookingId)
    .first<{ endDate: number }>();
  if (!booking) return null;

  const windowOpenedAt = windowOpenedAtSec(booking.endDate);
  const windowClosedAt = windowOpenedAt + BLIND_WINDOW_SEC;

  const rows = await db()
    .prepare("SELECT role FROM review WHERE bookingId = ?")
    .bind(bookingId)
    .all<{ role: ReviewRole }>();

  const roles = new Set((rows.results ?? []).map((r) => r.role));
  const bothSubmitted = roles.has("guest") && roles.has("host");
  const windowClosed = nowSec() >= windowClosedAt;

  return {
    guestReviewVisible: roles.has("guest") && (bothSubmitted || windowClosed),
    hostReviewVisible: roles.has("host") && (bothSubmitted || windowClosed),
    windowOpenedAt,
    windowClosedAt,
  };
}

/**
 * Reviews of a host BY guests (role='guest'), filtered to those visible per the
 * double-blind rule. Used for listing PDP + listing cards.
 */
export async function getReviewsForListing(
  vanListingId: string,
  limit = 6
): Promise<ReviewSummary> {
  const ns = nowSec();
  const rows = await db()
    .prepare(
      `SELECT r.id, r.rating, r.text, r.createdAt, r.hostResponse, r.hostRespondedAt, u.name AS authorName
       FROM review r
       JOIN booking b ON b.id = r.bookingId
       JOIN user u ON u.id = r.authorUserId
       WHERE r.role = 'guest'
         AND b.vanListingId = ?
         AND (
           EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
           OR (b.endDate / 1000 + ?) <= ?
         )
       ORDER BY r.createdAt DESC
       LIMIT ?`
    )
    .bind(vanListingId, HOLDBACK_SEC + BLIND_WINDOW_SEC, ns, limit)
    .all<{ id: string; rating: number; text: string; createdAt: number; authorName: string; hostResponse: string | null; hostRespondedAt: number | null }>();

  const agg = await db()
    .prepare(
      `SELECT AVG(r.rating) AS avgRating, COUNT(*) AS reviewCount
       FROM review r
       JOIN booking b ON b.id = r.bookingId
       WHERE r.role = 'guest'
         AND b.vanListingId = ?
         AND (
           EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
           OR (b.endDate / 1000 + ?) <= ?
         )`
    )
    .bind(vanListingId, HOLDBACK_SEC + BLIND_WINDOW_SEC, ns)
    .first<{ avgRating: number | null; reviewCount: number }>();

  return {
    avgRating: agg?.avgRating ?? null,
    reviewCount: agg?.reviewCount ?? 0,
    items: (rows.results ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      authorName: r.authorName,
      createdAt: r.createdAt,
      hostResponse: r.hostResponse,
      hostRespondedAt: r.hostRespondedAt,
    })),
  };
}

/**
 * Reviews of a host BY guests across all the host's listings.
 * Used for /hosts/[userId] public profile.
 */
export async function getReviewsForHost(
  hostUserId: string,
  limit = 6
): Promise<ReviewSummary> {
  const ns = nowSec();
  const rows = await db()
    .prepare(
      `SELECT r.id, r.rating, r.text, r.createdAt, r.hostResponse, r.hostRespondedAt, u.name AS authorName
       FROM review r
       JOIN booking b ON b.id = r.bookingId
       JOIN user u ON u.id = r.authorUserId
       WHERE r.role = 'guest'
         AND r.subjectUserId = ?
         AND (
           EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
           OR (b.endDate / 1000 + ?) <= ?
         )
       ORDER BY r.createdAt DESC
       LIMIT ?`
    )
    .bind(hostUserId, HOLDBACK_SEC + BLIND_WINDOW_SEC, ns, limit)
    .all<{ id: string; rating: number; text: string; createdAt: number; authorName: string; hostResponse: string | null; hostRespondedAt: number | null }>();

  const agg = await db()
    .prepare(
      `SELECT AVG(r.rating) AS avgRating, COUNT(*) AS reviewCount
       FROM review r
       JOIN booking b ON b.id = r.bookingId
       WHERE r.role = 'guest'
         AND r.subjectUserId = ?
         AND (
           EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
           OR (b.endDate / 1000 + ?) <= ?
         )`
    )
    .bind(hostUserId, HOLDBACK_SEC + BLIND_WINDOW_SEC, ns)
    .first<{ avgRating: number | null; reviewCount: number }>();

  return {
    avgRating: agg?.avgRating ?? null,
    reviewCount: agg?.reviewCount ?? 0,
    items: (rows.results ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      authorName: r.authorName,
      createdAt: r.createdAt,
      hostResponse: r.hostResponse,
      hostRespondedAt: r.hostRespondedAt,
    })),
  };
}

/**
 * Shared SQL fragment for the LEFT JOIN that adds visible avgRating + reviewCount
 * to a SELECT against van_listing aliased as `vl`. Uses unixepoch() so no
 * extra bind parameter is required — embed directly in any van_listing query.
 */
export const LISTING_RATING_SUBQUERY = `LEFT JOIN (
  SELECT b.vanListingId,
         AVG(r.rating) AS avgRating,
         COUNT(*)      AS reviewCount
  FROM review r
  JOIN booking b ON b.id = r.bookingId
  WHERE r.role = 'guest'
    AND (
      EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
      OR (b.endDate / 1000 + ${HOLDBACK_SEC + BLIND_WINDOW_SEC}) <= unixepoch()
    )
  GROUP BY b.vanListingId
) rv ON rv.vanListingId = vl.id`;

export { HOLDBACK_SEC, BLIND_WINDOW_SEC, nowSec as reviewNowSec };
