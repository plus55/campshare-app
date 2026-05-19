"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="cs-card">
      <h3>Listing actions</h3>
      {error && <div className="cs-error">{error}</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {(status === "draft" || status === "paused") && (
          <button
            type="button"
            className="cs-btn cs-btn-primary"
            disabled={busy !== null}
            onClick={() => act("submit", submit)}
          >
            {busy === "submit" ? "Submitting…" : "Submit for review"}
          </button>
        )}

        {status === "published" && (
          <button
            type="button"
            className="cs-btn cs-btn-ghost"
            disabled={busy !== null}
            onClick={() => act("pause", () => patch({ status: "paused" }))}
          >
            {busy === "pause" ? "Pausing…" : "Pause listing"}
          </button>
        )}

        {status === "paused" && (
          <button
            type="button"
            className="cs-btn cs-btn-ghost"
            disabled={busy !== null}
            onClick={() => act("submit", submit)}
          >
            {busy === "submit" ? "Submitting…" : "Re-submit for review"}
          </button>
        )}

        {status !== "archived" && (
          <button
            type="button"
            className="cs-btn cs-btn-danger"
            disabled={busy !== null}
            onClick={() => {
              if (!confirm("Archive this listing? It will be hidden from travellers.")) return;
              void act("archive", () => patch({ status: "archived" }));
            }}
          >
            {busy === "archive" ? "Archiving…" : "Archive"}
          </button>
        )}
      </div>

      {status === "pending_review" && (
        <p className="cs-muted cs-small" style={{ marginTop: 12 }}>
          Your listing is being reviewed. You&apos;ll receive an email once a decision is made.
        </p>
      )}
    </div>
  );
}
