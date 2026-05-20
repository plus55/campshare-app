"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  listingId: string;
  nightlyRateCents: number;
  minimumNights: number;
}

function parseDateMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingRequestForm({ listingId, nightlyRateCents, minimumNights }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const nights = startDate && endDate
    ? Math.max(0, Math.round((parseDateMs(endDate) - parseDateMs(startDate)) / 86400000))
    : 0;
  const totalDollars = nights > 0 ? (nights * nightlyRateCents / 100).toFixed(0) : null;

  async function submit() {
    if (!startDate || !endDate) { setError("Please select check-in and check-out dates"); return; }
    if (nights < minimumNights) { setError(`Minimum stay is ${minimumNights} night${minimumNights !== 1 ? "s" : ""}`); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, startDate, endDate, guestCount, message: message || null }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create booking");
      } else {
        router.push(`/trips/${data.id}`);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <p className="cs-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">Check-in</span>
          <input
            type="date"
            className="cs-input"
            min={todayString()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">Check-out</span>
          <input
            type="date"
            className="cs-input"
            min={startDate || todayString()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <label className="cs-field" style={{ margin: 0 }}>
        <span className="cs-label">Guests</span>
        <input
          type="number"
          className="cs-input"
          min={1}
          max={20}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <label className="cs-field" style={{ margin: 0 }}>
        <span className="cs-label">Message to host (optional)</span>
        <textarea
          className="cs-textarea"
          placeholder="Introduce yourself and share any details about your trip…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: 80 }}
        />
      </label>

      {nights > 0 && totalDollars && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink-700)" }}>
          {nights} night{nights !== 1 ? "s" : ""} · <strong>${totalDollars} NZD total</strong>
        </p>
      )}

      <button
        className="cs-btn cs-btn-primary cs-btn-block"
        disabled={loading}
        onClick={submit}
      >
        {loading ? "Requesting…" : "Request to book"}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-300)", textAlign: "center" }}>
        No payment required yet — the host has 48 hours to accept.
      </p>
    </div>
  );
}
