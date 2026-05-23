"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "under_review" | "resolved_host" | "resolved_guest" | "resolved_split" | "dismissed";
type DepositAction = "" | "released_to_host" | "returned_to_guest" | "split";

interface Props {
  disputeId: string;
  depositCents: number;
}

export default function DisputeActions({ disputeId, depositCents }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("under_review");
  const [depositAction, setDepositAction] = useState<DepositAction>("");
  const [splitDollars, setSplitDollars] = useState<string>(String(Math.round(depositCents / 200))); // default 50/50
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const payload: Record<string, unknown> = {
        status,
        adminNote: adminNote || null,
      };
      const isResolution = ["resolved_host", "resolved_guest", "resolved_split"].includes(status);
      if (isResolution) {
        if (!depositAction) {
          setErr("Select a deposit action when resolving");
          setBusy(false);
          return;
        }
        payload.depositAction = depositAction;
        if (depositAction === "split") {
          const cents = Math.round(Number(splitDollars) * 100);
          if (!Number.isFinite(cents) || cents < 0 || cents > depositCents) {
            setErr(`Split amount must be between $0 and $${(depositCents / 100).toFixed(0)}`);
            setBusy(false);
            return;
          }
          payload.depositSplitToHostCents = cents;
        }
      }
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(b.error ?? "Could not update dispute");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  const isResolution = ["resolved_host", "resolved_guest", "resolved_split"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="cs-field" style={{ margin: 0 }}>
        <label className="cs-label">Status</label>
        <select className="cs-select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="under_review">Under review (keep open, no resolution yet)</option>
          <option value="resolved_host">Resolved in favour of host</option>
          <option value="resolved_guest">Resolved in favour of guest</option>
          <option value="resolved_split">Resolved with split</option>
          <option value="dismissed">Dismiss (no action needed)</option>
        </select>
      </div>

      {isResolution && (
        <>
          <div className="cs-field" style={{ margin: 0 }}>
            <label className="cs-label">Deposit action</label>
            <select className="cs-select" value={depositAction} onChange={(e) => setDepositAction(e.target.value as DepositAction)}>
              <option value="">Choose…</option>
              <option value="released_to_host">Release ${(depositCents / 100).toFixed(0)} to host</option>
              <option value="returned_to_guest">Return ${(depositCents / 100).toFixed(0)} to guest</option>
              <option value="split">Split — partial to host, rest to guest</option>
            </select>
          </div>
          {depositAction === "split" && (
            <div className="cs-field" style={{ margin: 0 }}>
              <label className="cs-label">Amount to host (NZD)</label>
              <input
                type="number"
                className="cs-input"
                min={0}
                max={depositCents / 100}
                value={splitDollars}
                onChange={(e) => setSplitDollars(e.target.value)}
              />
              <p className="cs-muted cs-small" style={{ marginTop: 4 }}>
                Out of ${(depositCents / 100).toFixed(0)} held. Remainder returns to guest.
              </p>
            </div>
          )}
          <p className="cs-muted cs-small" style={{ margin: 0 }}>
            Recording the decision only — execute the actual Stripe refund/transfer manually via dashboard.stripe.com.
          </p>
        </>
      )}

      <div className="cs-field" style={{ margin: 0 }}>
        <label className="cs-label">Admin note (shown to both parties)</label>
        <textarea
          className="cs-textarea"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          style={{ minHeight: 100 }}
          placeholder="Explain the decision and any next steps."
        />
      </div>

      {err && <p className="cs-error" style={{ margin: 0 }}>{err}</p>}

      <div>
        <button type="button" className="cs-btn cs-btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
