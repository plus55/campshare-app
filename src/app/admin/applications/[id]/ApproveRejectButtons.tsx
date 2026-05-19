"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveRejectButtons({
  applicationId,
}: {
  applicationId: string;
}) {
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
      {error && <div className="cs-error">{error}</div>}
      <div className="cs-field">
        <label className="cs-label">
          Note to applicant (optional, included in email)
        </label>
        <textarea
          className="cs-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          className="cs-btn cs-btn-primary"
          onClick={() => send("approve")}
          disabled={busy !== null}
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          className="cs-btn cs-btn-danger"
          onClick={() => send("reject")}
          disabled={busy !== null}
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </>
  );
}
