"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  currentStartDate: number; // unix ms
  currentEndDate: number;   // unix ms
}

function toDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtNzd(cents: number): string {
  return `$${Math.abs(cents / 100).toFixed(0)}`;
}

export default function DateChangeForm({ bookingId, currentStartDate, currentEndDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(toDateInput(currentStartDate));
  const [endDate, setEndDate] = useState(toDateInput(currentEndDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [priceDiff, setPriceDiff] = useState<number | null>(null);

  if (!open) {
    return (
      <button className="cs-btn cs-btn-ghost cs-small" onClick={() => setOpen(true)}>
        Request date change
      </button>
    );
  }

  if (submitted && priceDiff !== null) {
    return (
      <div className="cs-card" style={{ marginTop: 16, background: "#f0fdf4" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Date change request sent</p>
        <p className="cs-muted cs-small" style={{ margin: "4px 0 0" }}>
          The host will respond shortly.
          {priceDiff > 0 && ` A price difference of ${fmtNzd(priceDiff)} may apply.`}
          {priceDiff < 0 && ` A refund of ${fmtNzd(priceDiff)} will be issued if accepted.`}
        </p>
        <button className="cs-btn cs-btn-ghost cs-small" style={{ marginTop: 12 }} onClick={() => router.refresh()}>
          Refresh
        </button>
      </div>
    );
  }

  async function submit() {
    if (!startDate || !endDate) { setError("Please select new dates"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/date-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json() as { id?: string; priceDiffCents?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit request");
      } else {
        setPriceDiff(data.priceDiffCents ?? 0);
        setSubmitted(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cs-card" style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 12px", fontWeight: 600 }}>Request date change</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">New check-in</span>
          <input
            type="date"
            className="cs-input"
            min={todayString()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">New check-out</span>
          <input
            type="date"
            className="cs-input"
            min={startDate || todayString()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="cs-error" style={{ margin: "0 0 8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="cs-btn cs-btn-primary cs-small" disabled={loading} onClick={submit}>
          {loading ? "Sending…" : "Send request"}
        </button>
        <button className="cs-btn cs-btn-ghost cs-small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <p className="cs-muted cs-small" style={{ margin: "8px 0 0" }}>
        The host must approve the change. A price adjustment may apply.
      </p>
    </div>
  );
}
