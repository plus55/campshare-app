"use client";

import { useEffect, useState } from "react";

export default function PayoutsOnboardPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function start() {
      try {
        const res = await fetch("/api/host/stripe/onboard", { method: "POST" });
        const text = await res.text();
        let data: { url?: string; error?: string } = {};
        try { data = JSON.parse(text); } catch { /* non-JSON response */ }
        if (!res.ok) {
          setError(data.error ?? `Server error (${res.status}). Please try again.`);
          return;
        }
        if (!data.url) {
          setError("No redirect URL returned. Please try again.");
          return;
        }
        window.location.href = data.url;
      } catch (e) {
        setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    start();
  }, []);

  if (error) {
    return (
      <div style={{ padding: "2rem", maxWidth: 480 }}>
        <p style={{ color: "#dc2626", marginBottom: "1rem" }}>{error}</p>
        <a href="/dashboard" style={{ color: "#2563eb", textDecoration: "underline" }}>
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 480 }}>
      <p style={{ color: "#6b7280" }}>Setting up your payout account…</p>
    </div>
  );
}
