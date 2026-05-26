"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@/lib/types";
import { canSelfCancelBooking } from "@/lib/booking-status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const errorCls = "rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

interface Props {
  bookingId: string;
  status: BookingStatus;
  viewerRole: "guest" | "host";
}

export function BookingActions({ bookingId, status, viewerRole }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  async function action(endpoint: string, body?: object) {
    setLoading(endpoint);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Something went wrong");
      } else {
        if (viewerRole === "host" && endpoint === "accept") {
          toast.success("Booking accepted and payment captured.");
          router.replace("/dashboard/bookings");
          router.refresh();
          return;
        }
        if (viewerRole === "host" && endpoint === "decline") {
          toast.success("Booking declined.");
          router.replace("/dashboard/bookings");
          router.refresh();
          return;
        }
        router.refresh();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  if (status === "requested" && viewerRole === "host") {
    if (showDeclineForm) {
      return (
        <div className="flex flex-col gap-2">
          {error && <p className={errorCls}>{error}</p>}
          <label htmlFor="decline-reason" className="sr-only">Reason for declining (optional)</label>
          <Textarea
            id="decline-reason"
            className="min-h-20"
            placeholder="Optional: reason for declining (sent to guest)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={loading !== null}
              onClick={() => action("decline", { reason: declineReason || null })}
            >
              {loading === "decline" ? "Declining…" : "Confirm decline"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowDeclineForm(false); setError(null); }}
            >
              Back
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {error && <p className={cn(errorCls, "w-full")}>{error}</p>}
        <Button
          disabled={loading !== null}
          onClick={() => action("accept")}
        >
          {loading === "accept" ? "Accepting…" : "Accept booking"}
        </Button>
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={() => setShowDeclineForm(true)}
        >
          Decline
        </Button>
      </div>
    );
  }

  if (status !== "requested" && canSelfCancelBooking(status) && (viewerRole === "guest" || viewerRole === "host")) {
    return (
      <div>
        {error && <p className={errorCls}>{error}</p>}
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={() => action("cancel")}
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel booking"}
        </Button>
      </div>
    );
  }

  if (status === "requested" && viewerRole === "guest") {
    return (
      <div>
        {error && <p className={errorCls}>{error}</p>}
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={() => action("cancel")}
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel request"}
        </Button>
      </div>
    );
  }

  return null;
}
