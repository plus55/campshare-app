"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export interface ListingAddon {
  addonId: string;
  name: string;
  description: string | null;
  priceNZDCents: number;
  priceType: "flat" | "per_night";
}

interface Props {
  listingId: string;
  nightlyRateCents: number;
  minimumNights: number;
  instantBook: boolean;
  listingAddons: ListingAddon[];
  kycStatus: "unverified" | "pending" | "verified" | "failed";
  minDriverAge: number;
}

interface Totals {
  subtotalCents: number;
  serviceFeeCents: number;
  gstOnFeeCents: number;
  addonTotalCents: number;
  totalCents: number;
  depositCents: number;
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function parseDateMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtNzd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// ── Inner payment step (must be inside <Elements>) ────────────────────────
interface PaymentStepProps {
  listingId: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  message: string;
  nights: number;
  totals: Totals;
  paymentIntentId: string;
  instantBook: boolean;
  selectedAddonIds: string[];
  selectedAddons: ListingAddon[];
  onBack: () => void;
}

function PaymentStep({
  listingId, startDate, endDate, guestCount, message,
  nights, totals, paymentIntentId, instantBook,
  selectedAddonIds, selectedAddons, onBack,
}: PaymentStepProps) {
  const router = useRouter();
  const stripeHook = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!stripeHook || !elements) return;
    setLoading(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripeHook.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed — please try again");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status !== "requires_capture") {
      setError("Payment authorization incomplete. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId, startDate, endDate, guestCount,
          message: message || null,
          paymentIntentId,
          selectedAddonIds,
        }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create booking");
      } else {
        router.push(`/trips/${data.id}`);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Booking summary */}
      <div style={{ background: "#f5ede0", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "var(--ink-700)" }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Booking summary</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Van hire ({nights} night{nights !== 1 ? "s" : ""})</span>
          <span>{fmtNzd(totals.subtotalCents)}</span>
        </div>
        {selectedAddons.map((a) => (
          <div key={a.addonId} style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span>{a.name}</span>
            <span>{fmtNzd(a.priceNZDCents)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span>Service fee (12%)</span>
          <span>{fmtNzd(totals.serviceFeeCents)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span>GST on service fee</span>
          <span>{fmtNzd(totals.gstOnFeeCents)}</span>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 8,
          paddingTop: 8, borderTop: "1px solid #e7dcc8", fontWeight: 600,
        }}>
          <span>Total charged today</span>
          <span>{fmtNzd(totals.totalCents)} NZD</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-400)" }}>
          Security deposit {fmtNzd(totals.depositCents)} authorised on trip start — not charged unless damage is reported.
        </p>
      </div>

      <PaymentElement />

      {error && <p className="cs-error" style={{ margin: 0 }}>{error}</p>}

      <button
        className="cs-btn cs-btn-primary cs-btn-block"
        disabled={loading || !stripeHook || !elements}
        onClick={submit}
      >
        {loading ? "Processing…" : instantBook ? `Confirm and pay ${fmtNzd(totals.totalCents)}` : `Authorise ${fmtNzd(totals.totalCents)}`}
      </button>

      <button
        className="cs-btn cs-btn-ghost cs-btn-block"
        disabled={loading}
        onClick={onBack}
        style={{ marginTop: -8 }}
      >
        ← Back to dates
      </button>

      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-300)", textAlign: "center" }}>
        {instantBook
          ? "Payment charged immediately — booking confirmed instantly, no host approval needed."
          : "Card authorised now — charged only when the host accepts."}
      </p>
    </div>
  );
}

// ── Main form component ───────────────────────────────────────────────────
export function BookingRequestForm(props: Props) {
  if (props.kycStatus !== "verified") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff4dc", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "var(--ink-700)" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Verify your identity to book</p>
          <p className="cs-muted cs-small" style={{ margin: 0 }}>
            CampShare requires all guests to verify their identity (driver&apos;s licence + selfie) before their first booking.
            {props.minDriverAge > 18 ? ` This van requires drivers aged ${props.minDriverAge}+.` : ""}
          </p>
        </div>
        <a href="/dashboard/profile" className="cs-btn cs-btn-primary cs-btn-block">
          {props.kycStatus === "pending" ? "Continue verification" : props.kycStatus === "failed" ? "Retry verification" : "Verify my identity"}
        </a>
      </div>
    );
  }
  return <BookingRequestFormInner {...props} />;
}

function BookingRequestFormInner({ listingId, nightlyRateCents, minimumNights, instantBook, listingAddons }: Props) {
  const [step, setStep] = useState<"details" | "payment">("details");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage]     = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [totals, setTotals]       = useState<Totals | null>(null);

  const nights = startDate && endDate
    ? Math.max(0, Math.round((parseDateMs(endDate) - parseDateMs(startDate)) / 86400000))
    : 0;

  const selectedAddons = listingAddons.filter((a) => selectedAddonIds.includes(a.addonId));

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  }

  const handleBack = useCallback(() => {
    setStep("details");
    setClientSecret(null);
    setPaymentIntentId(null);
    setTotals(null);
    setError(null);
  }, []);

  async function continueToPayment() {
    if (!startDate || !endDate) { setError("Please select check-in and check-out dates"); return; }
    if (nights < minimumNights) { setError(`Minimum stay is ${minimumNights} night${minimumNights !== 1 ? "s" : ""}`); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, startDate, endDate, guestCount, selectedAddonIds }),
      });
      const data = await res.json() as {
        clientSecret?: string;
        paymentIntentId?: string;
        totals?: Totals;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not prepare payment");
      } else if (data.clientSecret && data.paymentIntentId && data.totals) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setTotals(data.totals);
        setStep("payment");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (step === "payment" && clientSecret && paymentIntentId && totals && stripePromise) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: "stripe", variables: { colorPrimary: "#b8624a", borderRadius: "8px" } },
        }}
      >
        <PaymentStep
          listingId={listingId}
          startDate={startDate}
          endDate={endDate}
          guestCount={guestCount}
          message={message}
          nights={nights}
          totals={totals}
          paymentIntentId={paymentIntentId}
          instantBook={instantBook}
          selectedAddonIds={selectedAddonIds}
          selectedAddons={selectedAddons}
          onBack={handleBack}
        />
      </Elements>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <p className="cs-error" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">Check-in</span>
          <input
            type="date"
            className="cs-input"
            min={todayString()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="cs-field" style={{ margin: 0 }}>
          <span className="cs-label">Check-out</span>
          <input
            type="date"
            className="cs-input"
            min={startDate || todayString()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <label className="cs-field" style={{ margin: 0 }}>
        <span className="cs-label">Guests</span>
        <input
          type="number"
          className="cs-input"
          min={1}
          max={20}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
        />
      </label>

      {listingAddons.length > 0 && (
        <div>
          <p className="cs-label" style={{ margin: "0 0 8px" }}>Add-ons (optional)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {listingAddons.map((addon) => (
              <label
                key={addon.addonId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${selectedAddonIds.includes(addon.addonId) ? "var(--clay)" : "var(--line)"}`,
                  background: selectedAddonIds.includes(addon.addonId) ? "#fdf0eb" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAddonIds.includes(addon.addonId)}
                  onChange={() => toggleAddon(addon.addonId)}
                  style={{ flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 14 }}>{addon.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--clay)", flexShrink: 0 }}>
                  +{fmtNzd(addon.priceNZDCents)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="cs-field" style={{ margin: 0 }}>
        <span className="cs-label">Message to host (optional)</span>
        <textarea
          className="cs-textarea"
          placeholder="Introduce yourself and share any details about your trip…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: 80 }}
        />
      </label>

      {nights > 0 && nightlyRateCents > 0 && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink-700)" }}>
          {nights} night{nights !== 1 ? "s" : ""} · from{" "}
          <strong>{fmtNzd(nights * nightlyRateCents)} NZD</strong>{" "}
          <span style={{ fontSize: 12, color: "var(--ink-400)" }}>(+ fees)</span>
        </p>
      )}

      <button
        className="cs-btn cs-btn-primary cs-btn-block"
        disabled={loading}
        onClick={continueToPayment}
      >
        {loading ? "Checking…" : instantBook ? "Continue to instant payment" : "Continue to payment"}
      </button>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-300)", textAlign: "center" }}>
        {instantBook
          ? "Payment charged immediately — booking confirmed with no waiting."
          : "Card authorised now — charged only when the host accepts."}
      </p>
    </div>
  );
}
