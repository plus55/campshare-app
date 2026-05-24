"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ApproveRejectButtons({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(decision: "approve" | "reject") {
    setBusy(decision);
    setError(null);

    const res = await fetch(`/api/admin/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: note || null }),
    });

    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Couldn't update application.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && <div className="mb-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{error}</div>}
      <div className="mb-4 flex flex-col gap-1.5">
        <label htmlFor="application-note" className="text-sm font-medium text-foreground">Note to applicant (optional, included in email)</label>
        <Textarea id="application-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button type="button" onClick={() => send("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button type="button" variant="destructive" onClick={() => send("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </>
  );
}
