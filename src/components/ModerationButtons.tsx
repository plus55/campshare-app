"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  apiEndpoint: string;
}

export default function ModerationButtons({ id, apiEndpoint }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(decision: "approve" | "reject") {
    setBusy(decision);
    setError(null);

    const res = await fetch(apiEndpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim() || null }),
    });

    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Couldn't update.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && <div className="cs-error">{error}</div>}
      <div className="cs-field">
        <label className="cs-label">Note to host (optional, included in email)</label>
        <textarea className="cs-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" className="cs-btn cs-btn-primary" onClick={() => send("approve")} disabled={busy !== null}>
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button type="button" className="cs-btn cs-btn-danger" onClick={() => send("reject")} disabled={busy !== null}>
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </>
  );
}
