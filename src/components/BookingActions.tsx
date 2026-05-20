"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@/lib/types";

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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {error && <p className="cs-error">{error}</p>}
          <textarea
            className="cs-textarea"
            placeholder="Optional: reason for declining (sent to guest)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            style={{ minHeight: 80 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="cs-btn cs-btn-danger"
              disabled={loading !== null}
              onClick={() => action("decline", { reason: declineReason || null })}
            >
              {loading === "decline" ? "Declining…" : "Confirm decline"}
            </button>
            <button
              className="cs-btn cs-btn-ghost"
              onClick={() => { setShowDeclineForm(false); setError(null); }}
            >
              Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {error && <p className="cs-error" style={{ width: "100%" }}>{error}</p>}
        <button
          className="cs-btn cs-btn-primary"
          disabled={loading !== null}
          onClick={() => action("accept")}
        >
          {loading === "accept" ? "Accepting…" : "Accept booking"}
        </button>
        <button
          className="cs-btn cs-btn-ghost"
          disabled={loading !== null}
          onClick={() => setShowDeclineForm(true)}
        >
          Decline
        </button>
      </div>
    );
  }

  if ((status === "accepted" || status === "in_progress") && (viewerRole === "guest" || viewerRole === "host")) {
    return (
      <div>
        {error && <p className="cs-error">{error}</p>}
        <button
          className="cs-btn cs-btn-ghost"
          disabled={loading !== null}
          onClick={() => action("cancel")}
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel booking"}
        </button>
      </div>
    );
  }

  if (status === "requested" && viewerRole === "guest") {
    return (
      <div>
        {error && <p className="cs-error">{error}</p>}
        <button
          className="cs-btn cs-btn-ghost"
          disabled={loading !== null}
          onClick={() => action("cancel")}
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel request"}
        </button>
      </div>
    );
  }

  return null;
}
