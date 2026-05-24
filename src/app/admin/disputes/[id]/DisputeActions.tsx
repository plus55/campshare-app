"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
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
    <div className="flex flex-col gap-3">
      <div className={fieldCls}>
        <label className={labelCls}>Status</label>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
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
            <label className={labelCls}>Deposit action</label>
            <select className={selectCls} value={depositAction} onChange={(e) => setDepositAction(e.target.value as DepositAction)}>
              <option value="">Choose…</option>
              <option value="released_to_host">Release ${(depositCents / 100).toFixed(0)} to host</option>
              <option value="returned_to_guest">Return ${(depositCents / 100).toFixed(0)} to guest</option>
              <option value="split">Split — partial to host, rest to guest</option>
            </select>
          </div>
          {depositAction === "split" && (
            <div className={fieldCls}>
              <label className={labelCls}>Amount to host (NZD)</label>
              <Input
                type="number"
                className="h-9"
                min={0}
                max={depositCents / 100}
                value={splitDollars}
                onChange={(e) => setSplitDollars(e.target.value)}
              />
              <p className="text-[12px] text-muted-foreground">
                Out of ${(depositCents / 100).toFixed(0)} held. Remainder returns to guest.
              </p>
            </div>
          )}
          <p className="text-[12px] text-muted-foreground">
            Recording the decision only — execute the actual Stripe refund/transfer manually via dashboard.stripe.com.
          </p>
        </>
      )}

      <div className={fieldCls}>
        <label className={labelCls}>Admin note (shown to both parties)</label>
        <Textarea
          className="min-h-[100px]"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Explain the decision and any next steps."
        />
      </div>

      {err && <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{err}</p>}

      <div>
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
