"use client";

import Link from "next/link";
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
      <main className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-[480px] rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert">
            {error}
          </p>
          <Link href="/dashboard" className="text-sm text-clay underline hover:text-clay-deep">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground" aria-live="polite">Setting up your payout account...</p>
      </div>
    </main>
  );
}
