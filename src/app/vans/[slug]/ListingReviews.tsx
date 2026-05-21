import { getReviewsForListing } from "@/lib/reviews";

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? "var(--ochre)" : "var(--line)" }}>★</span>
      ))}
    </span>
  );
}

function relDate(createdAt: number): string {
  const diffDays = Math.floor((Date.now() / 1000 - createdAt) / 86400);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default async function ListingReviews({ listingId }: { listingId: string }) {
  const { avgRating, reviewCount, items } = await getReviewsForListing(listingId);

  if (reviewCount === 0) {
    return (
      <div className="cs-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Reviews</h2>
        <p className="cs-muted cs-small" style={{ margin: 0 }}>
          No reviews yet — be the first to book and review.
        </p>
      </div>
    );
  }

  return (
    <div className="cs-card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Reviews</h2>
        <span style={{ color: "var(--ochre)", fontSize: 16 }}>★</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>
          {avgRating!.toFixed(1)}
        </span>
        <span className="cs-muted cs-small">({reviewCount})</span>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((r) => (
          <div key={r.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.authorName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StarRating rating={r.rating} />
                <span className="cs-muted cs-small">{relDate(r.createdAt)}</span>
              </div>
            </div>
            <p className="cs-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{r.text}</p>
            {r.hostResponse && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--sand)", borderRadius: 8, borderLeft: "3px solid var(--clay)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clay)", marginBottom: 4 }}>
                  Host response
                  {r.hostRespondedAt && <span style={{ fontWeight: 400, color: "var(--stone)", marginLeft: 6 }}>{relDate(r.hostRespondedAt)}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--charcoal-soft)", lineHeight: 1.5 }}>{r.hostResponse}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
