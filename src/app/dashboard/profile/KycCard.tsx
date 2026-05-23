"use client";

import { useState } from "react";

interface Props {
  kycStatus: "unverified" | "pending" | "verified" | "failed";
}

export default function KycCard({ kycStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start verification");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setLoading(false);
    }
  }

  const badge = {
    unverified: { label: "Not verified", color: "var(--ink-400)", bg: "var(--sand-100)" },
    pending:    { label: "Verification pending", color: "var(--ochre)", bg: "#fff4dc" },
    verified:   { label: "Verified", color: "#1f7a3a", bg: "#e7f4ec" },
    failed:     { label: "Verification failed", color: "#a23b1f", bg: "#fbe6e0" },
  }[kycStatus];

  return (
    <div className="cs-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Identity verification</h2>
          <p className="cs-muted cs-small" style={{ margin: "4px 0 0" }}>
            Required before your first booking. Driver&apos;s licence + selfie. Handled by Stripe Identity.
          </p>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: badge.color,
            background: badge.bg,
            whiteSpace: "nowrap",
          }}
        >
          {badge.label}
        </span>
      </div>

      {error && <p className="cs-error" style={{ marginTop: 12 }}>{error}</p>}

      {kycStatus !== "verified" && (
        <button
          type="button"
          className="cs-btn cs-btn-primary"
          onClick={start}
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading
            ? "Starting…"
            : kycStatus === "pending"
              ? "Continue verification"
              : kycStatus === "failed"
                ? "Try again"
                : "Verify my identity"}
        </button>
      )}
    </div>
  );
}
