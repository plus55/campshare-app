"use client";

import { useState } from "react";

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

function fmtNzd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtNzdRound(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

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

export function PayoutRow({ payout }: { payout: PayoutRowData }) {
  const [open, setOpen] = useState(false);
  const hostFeeCents = Math.round(payout.subtotalCents * HOST_FEE_PCT / 100);
  const platformFeeCents = payout.serviceFeeCents + payout.gstOnFeeCents;

  return (
    <>
      <tr onClick={() => setOpen(!open)} style={{ cursor: "pointer" }} aria-expanded={open}>
        <td>
          <span style={{ display: "inline-block", width: 16, color: "var(--stone)" }}>
            {open ? "▾" : "▸"}
          </span>
          {payout.vanName}
        </td>
        <td>{fmtNzdRound(payout.subtotalCents)}</td>
        <td>{payout.addonTotalCents > 0 ? fmtNzdRound(payout.addonTotalCents) : "—"}</td>
        <td className="cs-muted cs-small">{fmtNzdRound(platformFeeCents)}</td>
        <td style={{ fontWeight: 600 }}>{fmtNzdRound(payout.amountCents)}</td>
        <td>
          <span className={`cs-pill ${payout.status === "paid" ? "cs-pill-published" : payout.status === "failed" ? "cs-pill-archived" : "cs-pill-pending"}`}>
            {payout.status}
          </span>
        </td>
        <td className="cs-muted cs-small">{fmtCreatedAt(payout.createdAt)}</td>
      </tr>
      {open && (
        <tr style={{ background: "var(--cream)" }}>
          <td colSpan={7} style={{ padding: "16px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <p className="cs-label cs-small" style={{ margin: "0 0 8px" }}>Booking</p>
                <p style={{ margin: 0 }}>
                  {fmtDateShort(payout.startDate)} → {fmtDateShort(payout.endDate)} · {payout.nights} {payout.nights === 1 ? "night" : "nights"}
                </p>
                <p className="cs-muted cs-small" style={{ margin: "4px 0 0" }}>
                  Booking ID: {payout.bookingId.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="cs-label cs-small" style={{ margin: "0 0 8px" }}>Your payout breakdown</p>
                <table style={{ width: "100%", fontSize: 14 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "2px 0" }}>Nightly subtotal</td>
                      <td style={{ padding: "2px 0", textAlign: "right" }}>{fmtNzd(payout.subtotalCents)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "2px 0", color: "var(--stone)" }}>Host fee ({HOST_FEE_PCT}%)</td>
                      <td style={{ padding: "2px 0", textAlign: "right", color: "var(--stone)" }}>−{fmtNzd(hostFeeCents)}</td>
                    </tr>
                    {payout.addonTotalCents > 0 && (
                      <tr>
                        <td style={{ padding: "2px 0" }}>Add-ons (no fee)</td>
                        <td style={{ padding: "2px 0", textAlign: "right" }}>+{fmtNzd(payout.addonTotalCents)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "6px 0 0", fontWeight: 600 }}>Net payout</td>
                      <td style={{ padding: "6px 0 0", textAlign: "right", fontWeight: 600 }}>{fmtNzd(payout.amountCents)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="cs-muted cs-small" style={{ margin: "12px 0 0" }}>
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
