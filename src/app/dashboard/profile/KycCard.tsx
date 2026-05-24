"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  kycStatus: "unverified" | "pending" | "verified" | "failed";
}

const badgeConfig = {
  unverified: { label: "Not verified",          cls: "text-muted-foreground bg-muted" },
  pending:    { label: "Verification pending",   cls: "text-ochre bg-ochre/10" },
  verified:   { label: "Verified",               cls: "text-moss bg-moss/10" },
  failed:     { label: "Verification failed",    cls: "text-destructive bg-destructive/10" },
};

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

  const badge = badgeConfig[kycStatus];

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 text-base font-semibold text-foreground">Identity verification</h2>
          <p className="text-[13px] text-muted-foreground">
            Required before your first booking. Driver&apos;s licence + selfie. Handled by Stripe Identity.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>
      )}

      {kycStatus !== "verified" && (
        <Button type="button" className="mt-4" onClick={start} disabled={loading}>
          {loading
            ? "Starting…"
            : kycStatus === "pending"
              ? "Continue verification"
              : kycStatus === "failed"
                ? "Try again"
                : "Verify my identity"}
        </Button>
      )}
    </div>
  );
}
