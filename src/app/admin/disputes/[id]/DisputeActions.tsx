"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtNzd } from "@/lib/money";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";

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
  const [splitDollars, setSplitDollars] = useState<string>(String(Math.round(depositCents / 200)));
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
            setErr(`Split amount must be between $0 and ${fmtNzd(depositCents)}`);
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
        const b = (await res.json().catch(() => ({}))) as {
          claim?: { status: string; reason?: string };
        };
        // Decision is saved either way. If the automatic deposit charge/transfer
        // failed, keep the admin on the page and surface why.
        if (b.claim?.status === "failed") {
          setErr(`Decision saved, but the deposit payout failed: ${b.claim.reason ?? "unknown error"}`);
        } else {
          router.refresh();
        }
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  const isResolution = ["resolved_host", "resolved_guest", "resolved_split"].includes(status);

  return (
    <div className="flex flex-col gap-3">
      <div className={fieldCls}>
        <label htmlFor="admin-dispute-status" className={labelCls}>Status</label>
        <select id="admin-dispute-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="under_review">Under review (keep open, no resolution yet)</option>
          <option value="resolved_host">Resolved in favour of host</option>
          <option value="resolved_guest">Resolved in favour of guest</option>
          <option value="resolved_split">Resolved with split</option>
          <option value="dismissed">Dismiss (no action needed)</option>
        </select>
      </div>

      {isResolution && (
        <>
          <div className={fieldCls}>
            <label htmlFor="admin-deposit-action" className={labelCls}>Deposit action</label>
            <select id="admin-deposit-action" className={selectCls} value={depositAction} onChange={(e) => setDepositAction(e.target.value as DepositAction)}>
              <option value="">Choose…</option>
              <option value="released_to_host">Release {fmtNzd(depositCents)} to host</option>
              <option value="returned_to_guest">Return {fmtNzd(depositCents)} to guest</option>
              <option value="split">Split — partial to host, rest to guest</option>
            </select>
          </div>
          {depositAction === "split" && (
            <div className={fieldCls}>
              <label htmlFor="admin-deposit-split" className={labelCls}>Amount to host (NZD)</label>
              <Input
                id="admin-deposit-split"
                type="number"
                className="h-9"
                min={0}
                max={depositCents / 100}
                value={splitDollars}
                onChange={(e) => setSplitDollars(e.target.value)}
              />
              <p className="text-[12px] text-muted-foreground">
                Out of {fmtNzd(depositCents)} held. Remainder returns to guest.
              </p>
            </div>
          )}
          <p className="text-[12px] text-muted-foreground">
            Awarding the deposit to the host charges the guest&apos;s saved card and pays the host automatically.
            Returning to the guest moves no money (the hold was already released).
          </p>
        </>
      )}

      <div className={fieldCls}>
        <label htmlFor="admin-dispute-note" className={labelCls}>Admin note (shown to both parties)</label>
        <Textarea
          id="admin-dispute-note"
          className="min-h-[100px]"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Explain the decision and any next steps."
        />
      </div>

      {err && <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert" aria-live="polite">{err}</p>}

      <div>
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
