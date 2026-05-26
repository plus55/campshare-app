"use client";

import { useState } from "react";
import { fmtNzd } from "@/lib/money";

export interface PayoutRowData {
  id: string;
  vanName: string;
  amountCents: number;
  status: string;
  createdAt: number;
  subtotalCents: number;
  serviceFeeCents: number;
  gstOnFeeCents: number;
  addonTotalCents: number;
  startDate: number;
  endDate: number;
  nights: number;
  bookingId: string;
}

const HOST_FEE_PCT = 5;

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

function fmtDateShort(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short",
    timeZone: "Pacific/Auckland",
  });
}

function fmtCreatedAt(unixSec: number) {
  return fmtDate(unixSec * 1000);
}

const statusBadge: Record<string, string> = {
  paid:    "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-moss/10 text-moss",
  failed:  "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-destructive/10 text-destructive",
};
function getStatusCls(status: string) {
  return statusBadge[status] ?? "rounded-full px-2 py-0.5 text-[11px] font-semibold bg-ochre/10 text-ochre";
}

export function PayoutRow({ payout }: { payout: PayoutRowData }) {
  const [open, setOpen] = useState(false);
  const hostFeeCents = Math.round(payout.subtotalCents * HOST_FEE_PCT / 100);
  const platformFeeCents = payout.serviceFeeCents + payout.gstOnFeeCents;

  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className="cursor-pointer hover:bg-muted/40"
        aria-expanded={open}
      >
        <td className="py-2 pr-4">
          <span className="mr-1.5 inline-block w-4 text-muted-foreground">
            {open ? "▾" : "▸"}
          </span>
          {payout.vanName}
        </td>
        <td className="py-2 pr-4">{fmtNzd(payout.subtotalCents)}</td>
        <td className="py-2 pr-4">{payout.addonTotalCents > 0 ? fmtNzd(payout.addonTotalCents) : "—"}</td>
        <td className="py-2 pr-4 text-[13px] text-muted-foreground">{fmtNzd(platformFeeCents)}</td>
        <td className="py-2 pr-4 font-semibold">{fmtNzd(payout.amountCents)}</td>
        <td className="py-2 pr-4">
          <span className={getStatusCls(payout.status)}>{payout.status}</span>
        </td>
        <td className="py-2 text-[13px] text-muted-foreground">{fmtCreatedAt(payout.createdAt)}</td>
      </tr>
      {open && (
        <tr className="bg-muted/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Booking</p>
                <p className="text-sm text-foreground">
                  {fmtDateShort(payout.startDate)} → {fmtDateShort(payout.endDate)} · {payout.nights} {payout.nights === 1 ? "night" : "nights"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Booking ID: {payout.bookingId.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your payout breakdown</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-0.5 text-foreground">Nightly subtotal</td>
                      <td className="py-0.5 text-right text-foreground">{fmtNzd(payout.subtotalCents)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-muted-foreground">Host fee ({HOST_FEE_PCT}%)</td>
                      <td className="py-0.5 text-right text-muted-foreground">−{fmtNzd(hostFeeCents)}</td>
                    </tr>
                    {payout.addonTotalCents > 0 && (
                      <tr>
                        <td className="py-0.5 text-foreground">Add-ons (no fee)</td>
                        <td className="py-0.5 text-right text-foreground">+{fmtNzd(payout.addonTotalCents)}</td>
                      </tr>
                    )}
                    <tr className="border-t border-border">
                      <td className="pt-1.5 font-semibold text-foreground">Net payout</td>
                      <td className="pt-1.5 text-right font-semibold text-foreground">{fmtNzd(payout.amountCents)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Guest also paid {fmtNzd(payout.serviceFeeCents)} service fee + {fmtNzd(payout.gstOnFeeCents)} GST (collected by CampShare).
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
