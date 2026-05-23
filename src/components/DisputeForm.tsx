"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
}

const REASONS = [
  { value: "damage", label: "Damage to the van" },
  { value: "cleanliness", label: "Cleanliness issue" },
  { value: "misrepresentation", label: "Listing didn't match" },
  { value: "no_show_host", label: "Host didn't show up" },
  { value: "no_show_guest", label: "Guest didn't show up" },
  { value: "other", label: "Other" },
] as const;

export default function DisputeForm({ bookingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("damage");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (details.trim().length < 10) {
      setError("Please describe the issue (at least 10 characters)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, reason, details }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not raise dispute");
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="cs-btn cs-btn-ghost cs-small" onClick={() => setOpen(true)}>
        Raise a dispute
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="cs-card" style={{ maxWidth: 520, width: "100%" }}>
            {done ? (
              <>
                <h3 style={{ marginTop: 0 }}>Dispute raised</h3>
                <p className="cs-muted">CampShare admin will review and contact you within 2 business days.</p>
                <button type="button" className="cs-btn cs-btn-primary" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Raise a dispute</h3>
                <p className="cs-muted cs-small">
                  Only available within 7 days of trip completion. Admin reviews the case and decides on the security deposit.
                </p>

                <div className="cs-field" style={{ marginTop: 12 }}>
                  <label className="cs-label">Reason</label>
                  <select className="cs-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div className="cs-field">
                  <label className="cs-label">What happened?</label>
                  <textarea
                    className="cs-textarea"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe the issue in as much detail as possible. Photos can be emailed to support@campshare.co.nz with the booking ID."
                    minLength={10}
                    maxLength={4000}
                    style={{ minHeight: 140 }}
                  />
                </div>

                {error && <p className="cs-error">{error}</p>}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button type="button" className="cs-btn cs-btn-ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</button>
                  <button type="button" className="cs-btn cs-btn-primary" onClick={submit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Raise dispute"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
