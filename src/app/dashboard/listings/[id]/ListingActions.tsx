"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { VanListing } from "@/lib/types";

export default function ListingActions({ listing }: { listing: VanListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: object) {
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error ?? "Request failed");
    }
  }

  async function submit() {
    const res = await fetch(`/api/listings/${listing.id}/submit`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error ?? "Request failed");
    }
  }

  async function act(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const { status } = listing;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-3 font-serif text-base text-foreground">Listing actions</h3>

      {error && (
        <p role="alert" aria-live="polite" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {(status === "draft" || status === "paused") && (
          <Button
            disabled={busy !== null}
            onClick={() => act("submit", submit)}
          >
            {busy === "submit" ? "Submitting…" : "Submit for review"}
          </Button>
        )}

        {status === "published" && (
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => act("pause", () => patch({ status: "paused" }))}
          >
            {busy === "pause" ? "Pausing…" : "Pause listing"}
          </Button>
        )}

        {status === "paused" && (
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => act("submit", submit)}
          >
            {busy === "submit" ? "Submitting…" : "Re-submit for review"}
          </Button>
        )}

        {status !== "archived" && (
          <Button
            variant="destructive"
            disabled={busy !== null}
            onClick={() => {
              if (!confirm("Archive this listing? It will be hidden from travellers.")) return;
              void act("archive", () => patch({ status: "archived" }));
            }}
          >
            {busy === "archive" ? "Archiving…" : "Archive"}
          </Button>
        )}
      </div>

      {status === "pending_review" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Your listing is being reviewed. You&apos;ll receive an email once a decision is made.
        </p>
      )}
    </div>
  );
}
