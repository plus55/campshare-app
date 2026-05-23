"use client";

import { useState } from "react";

interface Props {
  reportedUserId: string;
  reportedName: string;
  bookingId?: string;
  variant?: "link" | "button";
}

const REASONS = [
  { value: "inappropriate_behaviour", label: "Inappropriate behaviour" },
  { value: "fraud", label: "Fraud or scam" },
  { value: "no_show", label: "No-show" },
  { value: "property_damage", label: "Property damage" },
  { value: "other", label: "Other" },
] as const;

export default function ReportButton({ reportedUserId, reportedName, bookingId, variant = "link" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("inappropriate_behaviour");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportedUserId, reason, details: details || null, bookingId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not submit report");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "button" ? "cs-btn cs-btn-ghost cs-small" : ""}
        style={
          variant === "link"
            ? { background: "none", border: "none", padding: 0, color: "var(--clay)", textDecoration: "underline", cursor: "pointer", fontSize: 13 }
            : undefined
        }
      >
        Report {reportedName}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="cs-card" style={{ maxWidth: 480, width: "100%" }}>
            {done ? (
              <>
                <h3 style={{ marginTop: 0 }}>Report submitted</h3>
                <p className="cs-muted">Thanks for letting us know. Our team will review and follow up if action is needed.</p>
                <button type="button" className="cs-btn cs-btn-primary" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Report {reportedName}</h3>
                <p className="cs-muted cs-small">Only CampShare admins see reports. The reported user is not notified.</p>

                <div className="cs-field" style={{ marginTop: 12 }}>
                  <label className="cs-label">Reason</label>
                  <select className="cs-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div className="cs-field">
                  <label className="cs-label">Details (optional)</label>
                  <textarea
                    className="cs-textarea"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="What happened?"
                    maxLength={2000}
                    style={{ minHeight: 100 }}
                  />
                </div>

                {error && <p className="cs-error">{error}</p>}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button type="button" className="cs-btn cs-btn-ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</button>
                  <button type="button" className="cs-btn cs-btn-primary" onClick={submit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit report"}
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
