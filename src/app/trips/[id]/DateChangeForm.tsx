"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  bookingId: string;
  currentStartDate: number; // unix ms
  currentEndDate: number;   // unix ms
}

function toDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtNzd(cents: number): string {
  return `$${Math.abs(cents / 100).toFixed(0)}`;
}

const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";

export default function DateChangeForm({ bookingId, currentStartDate, currentEndDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(toDateInput(currentStartDate));
  const [endDate, setEndDate] = useState(toDateInput(currentEndDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [priceDiff, setPriceDiff] = useState<number | null>(null);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Request date change
      </Button>
    );
  }

  if (submitted && priceDiff !== null) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="font-semibold text-foreground">Date change request sent</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The host will respond shortly.
          {priceDiff > 0 && ` A price difference of ${fmtNzd(priceDiff)} may apply.`}
          {priceDiff < 0 && ` A refund of ${fmtNzd(priceDiff)} will be issued if accepted.`}
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    );
  }

  async function submit() {
    if (!startDate || !endDate) { setError("Please select new dates"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/date-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json() as { id?: string; priceDiffCents?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit request");
      } else {
        setPriceDiff(data.priceDiffCents ?? 0);
        setSubmitted(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 font-semibold text-foreground">Request date change</p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label htmlFor="date-change-start" className={labelCls}>New check-in</label>
          <Input
            id="date-change-start"
            type="date"
            className="h-9"
            min={todayString()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className={fieldCls}>
          <label htmlFor="date-change-end" className={labelCls}>New check-out</label>
          <Input
            id="date-change-end"
            type="date"
            className="h-9"
            min={startDate || todayString()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="mb-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={loading} onClick={submit}>
          {loading ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        The host must approve the change. A price adjustment may apply.
      </p>
    </div>
  );
}
