"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <Button variant="outline" size="sm" disabled={loading} onClick={open}>
      {loading ? "Opening…" : "Open Stripe dashboard ↗"}
    </Button>
  );
}
