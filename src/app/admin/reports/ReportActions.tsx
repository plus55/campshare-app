"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(status: "reviewed" | "actioned" | "dismissed") {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, adminNote: note || null }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(b.error ?? "Could not update report");
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        className="cs-textarea"
        placeholder="Admin note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ minHeight: 60 }}
      />
      {err && <p className="cs-error" style={{ margin: 0 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="cs-btn cs-btn-ghost cs-small" onClick={() => act("dismissed")} disabled={busy}>Dismiss</button>
        <button type="button" className="cs-btn cs-btn-ghost cs-small" onClick={() => act("reviewed")} disabled={busy}>Mark reviewed</button>
        <button type="button" className="cs-btn cs-btn-primary cs-small" onClick={() => act("actioned")} disabled={busy}>Mark actioned</button>
      </div>
    </div>
  );
}
