"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex flex-col gap-2">
      <label htmlFor={`admin-report-note-${reportId}`} className="sr-only">Admin note</label>
      <Textarea
        id={`admin-report-note-${reportId}`}
        className="min-h-[60px]"
        placeholder="Admin note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {err && <p role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => act("dismissed")} disabled={busy}>Dismiss</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => act("reviewed")} disabled={busy}>Mark reviewed</Button>
        <Button type="button" size="sm" onClick={() => act("actioned")} disabled={busy}>Mark actioned</Button>
      </div>
    </div>
  );
}
