"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StripeDashboardButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/host/stripe/dashboard", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open Stripe dashboard.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not open Stripe dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" size="sm" disabled={loading} onClick={open}>
      {loading ? "Opening…" : "Open Stripe dashboard ↗"}
      </Button>
      {error && <p role="alert" aria-live="polite" className="m-0 max-w-64 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
