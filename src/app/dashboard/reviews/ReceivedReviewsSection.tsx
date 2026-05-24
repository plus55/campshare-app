"use client";

import { useRouter } from "next/navigation";
import HostResponseForm from "./HostResponseForm";

interface ReceivedReview {
  id: string;
  rating: number;
  text: string;
  authorName: string;
  createdAt: number;
  vanName: string;
  hostResponse: string | null;
  hostRespondedAt: number | null;
}

function relDate(sec: number): string {
  const diffDays = Math.floor((Date.now() / 1000 - sec) / 86400);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "text-ochre" : "text-border"}>★</span>
      ))}
    </span>
  );
}

export default function ReceivedReviewsSection({ reviews }: { reviews: ReceivedReview[] }) {
  const router = useRouter();

  if (reviews.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-1 font-serif text-xl text-forest-deep dark:text-cream">Reviews received</h2>
      <p className="mb-4 text-sm text-muted-foreground">Guest reviews of your listings. You can respond publicly to each one.</p>
      <div className="grid gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="font-semibold text-foreground">{r.authorName}</span>
                <span className="ml-2 text-[12px] text-muted-foreground">on <em>{r.vanName}</em></span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-[12px] text-muted-foreground">{relDate(r.createdAt)}</span>
              </div>
            </div>
            <p className="mb-2.5 text-sm leading-relaxed text-foreground">{r.text}</p>

            {r.hostResponse ? (
              <div className="rounded-lg border-l-[3px] border-clay bg-secondary px-3.5 py-2.5">
                <div className="mb-1 text-[12px] font-semibold text-clay">
                  Your response
                  {r.hostRespondedAt && (
                    <span className="ml-1.5 font-normal text-muted-foreground">{relDate(r.hostRespondedAt)}</span>
                  )}
                </div>
                <p className="m-0 text-[13px] leading-relaxed text-foreground">{r.hostResponse}</p>
              </div>
            ) : (
              <HostResponseForm reviewId={r.id} onSuccess={() => router.refresh()} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
