"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewRole } from "@/lib/types";

const MIN_CHARS = 20;

export default function ReviewForm({
  bookingId,
  role,
  vanName,
}: {
  bookingId: string;
  role: ReviewRole;
  vanName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = hover || rating;
  const tooShort = text.trim().length < MIN_CHARS;
  const disabled = submitting || rating < 1 || tooShort;

  const placeholder = role === "guest"
    ? `Share what your trip in ${vanName} was like — pickup, the van, the host, anything future travellers would want to know.`
    : `Share what hosting this guest was like — communication, care for the van, anything future hosts would want to know.`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, text: text.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setError((data as { error?: string }).error ?? `Could not submit review (${res.status})`);
        setSubmitting(false);
        return;
      }
      router.push(`/trips/${bookingId}?reviewed=1`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cs-card" style={{ padding: 24, display: "grid", gap: 20 }}>
      <div>
        <label className="cs-label" style={{ display: "block", marginBottom: 8 }}>Overall rating</label>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 32,
                lineHeight: 1,
                padding: 4,
                color: n <= display ? "var(--ochre)" : "var(--line)",
                transition: "color 80ms",
              }}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="cs-muted cs-small" style={{ alignSelf: "center", marginLeft: 8 }}>
              {rating} / 5
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="review-text" className="cs-label" style={{ display: "block", marginBottom: 8 }}>
          Your review
        </label>
        <textarea
          id="review-text"
          className="cs-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={6}
          maxLength={4000}
          style={{ width: "100%", resize: "vertical", minHeight: 140 }}
        />
        <div className="cs-small cs-muted" style={{ marginTop: 6, textAlign: "right" }}>
          {text.trim().length < MIN_CHARS
            ? `${MIN_CHARS - text.trim().length} more character${MIN_CHARS - text.trim().length === 1 ? "" : "s"} needed`
            : `${text.trim().length} characters`}
        </div>
      </div>

      {error && (
        <div className="cs-alert cs-alert-error" style={{ padding: 12, borderRadius: 8, background: "#fbe9e4", color: "#7a2614" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          type="submit"
          className="cs-btn cs-btn-primary"
          disabled={disabled}
          style={{ opacity: disabled ? 0.55 : 1 }}
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
