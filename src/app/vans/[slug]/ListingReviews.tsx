import { getReviewsForListing } from "@/lib/reviews";

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "text-ochre" : "text-border"}>★</span>
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
      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-2 font-serif text-xl text-forest-deep dark:text-cream">Reviews</h2>
        <p className="text-[13px] text-muted-foreground">
          No reviews yet — be the first to book and review.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-baseline gap-2.5">
        <h2 className="font-serif text-xl text-forest-deep dark:text-cream">Reviews</h2>
        <span className="text-base text-ochre">★</span>
        <span className="text-base font-bold text-foreground">
          {avgRating!.toFixed(1)}
        </span>
        <span className="text-[13px] text-muted-foreground">({reviewCount})</span>
      </div>

      <div className="grid gap-4">
        {items.map((r) => (
          <div key={r.id} className="border-t border-border pt-4">
            <div className="mb-1.5 flex justify-between">
              <div className="text-sm font-semibold text-foreground">{r.authorName}</div>
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-[13px] text-muted-foreground">{relDate(r.createdAt)}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{r.text}</p>
            {r.hostResponse && (
              <div className="mt-2.5 rounded-lg border-l-[3px] border-clay bg-secondary px-3.5 py-2.5">
                <div className="mb-1 text-xs font-semibold text-clay">
                  Host response
                  {r.hostRespondedAt && <span className="ml-1.5 font-normal text-muted-foreground">{relDate(r.hostRespondedAt)}</span>}
                </div>
                <p className="text-[13px] leading-snug text-foreground">{r.hostResponse}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
