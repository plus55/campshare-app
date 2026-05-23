"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const errorCls = "mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

interface Props {
  reportedUserId: string;
  reportedName: string;
  bookingId?: string;
  variant?: "link" | "button";
}

const REASONS = [
  { value: "inappropriate_behaviour", label: "Inappropriate behaviour" },
  { value: "fraud", label: "Fraud or scam" },
  { value: "no_show", label: "No-show" },
  { value: "property_damage", label: "Property damage" },
  { value: "other", label: "Other" },
] as const;

export default function ReportButton({ reportedUserId, reportedName, bookingId, variant = "link" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("inappropriate_behaviour");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportedUserId, reason, details: details || null, bookingId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not submit report");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {variant === "button" ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Report {reportedName}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer p-0 text-[13px] text-clay underline hover:text-clay-deep"
        >
          Report {reportedName}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-lg">
            {done ? (
              <>
                <h3 className="mb-2 font-serif text-lg text-forest-deep dark:text-cream">Report submitted</h3>
                <p className="mb-4 text-sm text-muted-foreground">Thanks for letting us know. Our team will review and follow up if action is needed.</p>
                <Button type="button" onClick={() => setOpen(false)}>Close</Button>
              </>
            ) : (
              <>
                <h3 className="mb-1.5 font-serif text-lg text-forest-deep dark:text-cream">Report {reportedName}</h3>
                <p className="text-[13px] text-muted-foreground">Only CampShare admins see reports. The reported user is not notified.</p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Reason</label>
                  <select className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Details (optional)</label>
                  <Textarea
                    className="min-h-[100px]"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="What happened?"
                    maxLength={2000}
                  />
                </div>

                {error && <p className={errorCls}>{error}</p>}

                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="button" onClick={submit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit report"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
