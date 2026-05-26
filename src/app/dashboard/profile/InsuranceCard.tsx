"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InsuranceCoverType, InsuranceStatus } from "@/lib/types";
import { INSURANCE_DOC_CONTENT_TYPES, MAX_INSURANCE_DOC_BYTES } from "@/lib/insurance";

interface Props {
  status: InsuranceStatus;
  provider: string | null;
  policyNumber: string | null;
  coverType: InsuranceCoverType | null;
  expiryDate: number | null; // unix seconds
  adminNote: string | null;
  hasDoc: boolean;
}

const badgeConfig: Record<InsuranceStatus, { label: string; cls: string }> = {
  none: { label: "Not provided", cls: "text-muted-foreground bg-muted" },
  pending: { label: "Awaiting review", cls: "text-ochre bg-ochre/10" },
  verified: { label: "Verified", cls: "text-moss bg-moss/10" },
  rejected: { label: "Rejected", cls: "text-destructive bg-destructive/10" },
  expired: { label: "Expired", cls: "text-destructive bg-destructive/10" },
};

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";

function toDateInput(expiryDate: number | null): string {
  if (!expiryDate) return "";
  return new Date(expiryDate * 1000).toISOString().slice(0, 10);
}

export default function InsuranceCard(props: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState(props.provider ?? "");
  const [policyNumber, setPolicyNumber] = useState(props.policyNumber ?? "");
  const [coverType, setCoverType] = useState<InsuranceCoverType>(props.coverType ?? "p2p_rental");
  const [expiry, setExpiry] = useState(toDateInput(props.expiryDate));
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const badge = badgeConfig[props.status];
  const editing = props.status !== "verified";

  async function submit() {
    setError(null);
    const file = fileRef.current?.files?.[0] ?? null;

    if (!file && !props.hasDoc) {
      setError("Attach your certificate of currency or policy schedule.");
      return;
    }
    if (file) {
      if (!INSURANCE_DOC_CONTENT_TYPES.includes(file.type as never)) {
        setError("Upload a PDF, JPG, PNG or WebP file.");
        return;
      }
      if (file.size > MAX_INSURANCE_DOC_BYTES) {
        setError("File must be 10 MB or smaller.");
        return;
      }
    }
    if (!attested) {
      setError("Confirm your policy permits renting this vehicle for payment.");
      return;
    }

    setBusy(true);
    try {
      let docR2Key = "";
      if (file) {
        const signRes = await fetch("/api/host/insurance/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
        });
        if (!signRes.ok) {
          const j = (await signRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Couldn't get an upload URL.");
        }
        const signed = (await signRes.json()) as { signedUrl: string; r2Key: string };
        const putRes = await fetch(signed.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload to storage failed.");
        docR2Key = signed.r2Key;
      }

      const res = await fetch("/api/host/insurance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, policyNumber, coverType, expiryDate: expiry, docR2Key, attested }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Couldn't submit insurance.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 text-base font-semibold text-foreground">Hire insurance</h2>
          <p className="text-[13px] text-muted-foreground">
            Required before a listing can go live. Your policy must permit renting the vehicle for payment
            (&ldquo;hire or reward&rdquo;). Standard personal cover usually excludes this.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {props.status === "verified" && props.expiryDate && (
        <p className="mt-3 text-sm text-muted-foreground">
          {props.provider} · valid until {new Date(props.expiryDate * 1000).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}

      {props.adminNote && (props.status === "rejected" || props.status === "expired") && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{props.adminNote}</p>
      )}

      {editing && (
        <div className="mt-4 flex flex-col gap-3">
          <div className={fieldCls}>
            <label htmlFor="ins-provider" className={labelCls}>Insurer / provider</label>
            <Input id="ins-provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Star Insure, Tower, broker name" />
          </div>
          <div className={fieldCls}>
            <label htmlFor="ins-policy" className={labelCls}>Policy number</label>
            <Input id="ins-policy" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </div>
          <div className={fieldCls}>
            <label htmlFor="ins-cover" className={labelCls}>Cover type</label>
            <select id="ins-cover" className={selectCls} value={coverType} onChange={(e) => setCoverType(e.target.value as InsuranceCoverType)}>
              <option value="p2p_rental">Peer-to-peer / short-term rental policy</option>
              <option value="commercial_fleet">Commercial / fleet policy</option>
              <option value="self_attested">Other — permits paid hire</option>
            </select>
          </div>
          <div className={fieldCls}>
            <label htmlFor="ins-expiry" className={labelCls}>Policy expiry date</label>
            <Input id="ins-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className={fieldCls}>
            <label htmlFor="ins-doc" className={labelCls}>
              Certificate of currency / policy schedule {props.hasDoc && <span className="text-muted-foreground">(re-upload to replace)</span>}
            </label>
            <input
              id="ins-doc"
              ref={fileRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            <p className="text-[12px] text-muted-foreground">PDF or image, up to 10 MB. Stored privately and only seen by CampShare for verification.</p>
          </div>
          <label className="flex items-start gap-2 text-[13px] text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
            <span>I confirm this policy permits renting this vehicle for payment, and the details above are accurate.</span>
          </label>

          {error && (
            <p role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>
          )}

          <div>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : props.status === "pending" ? "Resubmit insurance" : "Submit for verification"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
