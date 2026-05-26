"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MIN_CHARS = 20;

export default function ReviewForm({
  bookingId,
  role,
  vanName,
  returnHref,
}: {
  bookingId: string;
  role: ReviewRole;
  vanName: string;
  returnHref: string;
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
      router.push(returnHref);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 rounded-2xl border border-border bg-card p-6">
      <div>
        <p id="review-rating-label" className="mb-2 block text-sm font-medium text-foreground">Overall rating</p>
        <div className="flex gap-1.5" role="group" aria-labelledby="review-rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="cursor-pointer border-none bg-transparent p-1 text-[32px] leading-none transition-colors"
              style={{ color: n <= display ? "var(--ochre)" : "var(--border)" }}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="self-center ml-2 text-[12px] text-muted-foreground">{rating} / 5</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="review-text" className="mb-2 block text-sm font-medium text-foreground">
          Your review
        </label>
        <Textarea
          id="review-text"
          className="min-h-[140px] resize-y"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={4000}
        />
        <div className="mt-1.5 text-right text-[12px] text-muted-foreground">
          {tooShort
            ? `${MIN_CHARS - text.trim().length} more character${MIN_CHARS - text.trim().length === 1 ? "" : "s"} needed`
            : `${text.trim().length} characters`}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{error}</div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          {submitting ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
