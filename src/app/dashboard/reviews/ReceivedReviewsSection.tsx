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
        <span key={n} style={{ color: n <= Math.round(rating) ? "var(--ochre)" : "var(--line)" }}>★</span>
      ))}
    </span>
  );
}

export default function ReceivedReviewsSection({ reviews }: { reviews: ReceivedReview[] }) {
  const router = useRouter();

  if (reviews.length === 0) return null;

  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ marginBottom: 4 }}>Reviews received</h2>
      <p className="cs-muted" style={{ marginBottom: 16 }}>Guest reviews of your listings. You can respond publicly to each one.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {reviews.map((r) => (
          <div key={r.id} className="cs-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 600 }}>{r.authorName}</span>
                <span className="cs-muted cs-small" style={{ marginLeft: 8 }}>on <em>{r.vanName}</em></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StarRating rating={r.rating} />
                <span className="cs-muted cs-small">{relDate(r.createdAt)}</span>
              </div>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--charcoal-soft)", lineHeight: 1.55 }}>{r.text}</p>

            {r.hostResponse ? (
              <div style={{ padding: "10px 14px", background: "var(--sand)", borderRadius: 8, borderLeft: "3px solid var(--clay)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clay)", marginBottom: 4 }}>
                  Your response
                  {r.hostRespondedAt && <span style={{ fontWeight: 400, color: "var(--stone)", marginLeft: 6 }}>{relDate(r.hostRespondedAt)}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--charcoal-soft)", lineHeight: 1.5 }}>{r.hostResponse}</p>
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
