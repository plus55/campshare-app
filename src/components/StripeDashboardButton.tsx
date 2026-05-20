"use client";

import { useState } from "react";

export function StripeDashboardButton() {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch("/api/host/stripe/dashboard", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="cs-btn cs-btn-ghost" disabled={loading} onClick={open}>
      {loading ? "Opening…" : "Open Stripe dashboard ↗"}
    </button>
  );
}
