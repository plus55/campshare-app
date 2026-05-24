"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const errorCls = "rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

interface Props {
  bookingId: string;
}

const REASONS = [
  { value: "damage", label: "Damage to the van" },
  { value: "cleanliness", label: "Cleanliness issue" },
  { value: "misrepresentation", label: "Listing didn't match" },
  { value: "no_show_host", label: "Host didn't show up" },
  { value: "no_show_guest", label: "Guest didn't show up" },
  { value: "other", label: "Other" },
] as const;

export default function DisputeForm({ bookingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("damage");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (details.trim().length < 10) {
      setError("Please describe the issue (at least 10 characters)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, reason, details }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not raise dispute");
      } else {
        setDone(true);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Raise a dispute
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[520px] rounded-2xl border border-border bg-card p-6 shadow-lg">
            {done ? (
              <>
                <DialogTitle className="mb-2 font-serif text-lg text-forest-deep">Dispute raised</DialogTitle>
                <DialogDescription className="mb-4">CampShare admin will review and contact you within 2 business days.</DialogDescription>
                <Button type="button" onClick={() => setOpen(false)}>Close</Button>
              </>
            ) : (
              <>
                <DialogTitle className="mb-1.5 font-serif text-lg text-forest-deep">Raise a dispute</DialogTitle>
                <DialogDescription className="text-[13px]">
                  Only available within 7 days of trip completion. Admin reviews the case and decides on the security deposit.
                </DialogDescription>

                <div className="mt-3 flex flex-col gap-1.5">
                  <label htmlFor="dispute-reason" className="text-sm font-medium text-foreground">Reason</label>
                  <select id="dispute-reason" className={selectCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  <label htmlFor="dispute-details" className="text-sm font-medium text-foreground">What happened?</label>
                  <Textarea
                    id="dispute-details"
                    className="min-h-[140px]"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe the issue in as much detail as possible. Photos can be emailed to support@campshare.co.nz with the booking ID."
                    minLength={10}
                    maxLength={4000}
                  />
                </div>

                {error && <p className={cn(errorCls, "mt-3")} role="alert" aria-live="polite">{error}</p>}

                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="button" onClick={submit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Raise dispute"}
                  </Button>
                </div>
              </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
