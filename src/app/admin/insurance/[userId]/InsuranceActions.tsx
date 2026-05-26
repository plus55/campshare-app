"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";

export default function InsuranceActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/hosts/${userId}/insurance`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, note: note || null }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(b.error ?? "Could not update insurance");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={fieldCls}>
        <label htmlFor="ins-note" className={labelCls}>Note to host (required to reject)</label>
        <Textarea
          id="ins-note"
          className="min-h-[90px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. The schedule doesn't show hire/rental cover — please send the page that lists permitted use."
        />
      </div>

      {err && <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{err}</p>}

      <div className="flex gap-2">
        <Button type="button" onClick={() => decide("approve")} disabled={busy}>
          {busy ? "Saving…" : "Approve"}
        </Button>
        <Button type="button" variant="outline" onClick={() => decide("reject")} disabled={busy}>
          Reject
        </Button>
      </div>
    </div>
  );
}
