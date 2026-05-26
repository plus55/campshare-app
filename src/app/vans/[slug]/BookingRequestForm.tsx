"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import AuthModal from "@/components/AuthModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fmtNzd } from "@/lib/money";

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
  isLoggedIn?: boolean;
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

const errorCls = "rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";
const fieldLabelCls = "text-sm font-medium text-foreground";

function parseDateMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
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

    try {
      const { error: confirmError, paymentIntent } = await stripeHook.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });

      if (confirmError) {
        setError(confirmError.message ?? "Payment failed - please try again");
        return;
      }

      if (paymentIntent?.status !== "requires_capture") {
        setError("Payment authorization incomplete. Please try again.");
        return;
      }

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
    <div className="flex flex-col gap-4">
      {/* Booking summary */}
      <div className="rounded-[10px] bg-muted px-4 py-3.5 text-sm text-muted-foreground">
        <p className="mb-2 font-semibold text-foreground">Booking summary</p>
        <div className="flex justify-between">
          <span>Van hire ({nights} night{nights !== 1 ? "s" : ""})</span>
          <span>{fmtNzd(totals.subtotalCents)}</span>
        </div>
        {selectedAddons.map((a) => (
          <div key={a.addonId} className="mt-1 flex justify-between">
            <span>{a.name}</span>
            <span>{fmtNzd(a.priceNZDCents)}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between">
          <span>Service fee (12%)</span>
          <span>{fmtNzd(totals.serviceFeeCents)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>GST on service fee</span>
          <span>{fmtNzd(totals.gstOnFeeCents)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
          <span>Total charged today</span>
          <span>{fmtNzd(totals.totalCents)} NZD</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Security deposit {fmtNzd(totals.depositCents)} authorised on trip start — not charged unless damage is reported.
        </p>
      </div>

      <PaymentElement />

      {error && <p className={errorCls} role="alert" aria-live="polite">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        disabled={loading || !stripeHook || !elements}
        onClick={submit}
      >
        {loading ? "Processing…" : instantBook ? `Confirm and pay ${fmtNzd(totals.totalCents)}` : `Authorise ${fmtNzd(totals.totalCents)}`}
      </Button>

      <Button
        variant="outline"
        className="-mt-2 w-full"
        disabled={loading}
        onClick={onBack}
      >
        ← Back to dates
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {instantBook
          ? "Payment charged immediately — booking confirmed instantly, no host approval needed."
          : "Card authorised now — charged only when the host accepts."}
      </p>
    </div>
  );
}

// ── Main form component ───────────────────────────────────────────────────
export function BookingRequestForm(props: Props) {
  if (!props.isLoggedIn) {
    return <BookingRequestFormInner {...props} />;
  }
  if (props.kycStatus !== "verified") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[10px] border border-ochre/30 bg-ochre/10 px-4 py-3.5 text-sm text-muted-foreground">
          <p className="mb-1.5 font-semibold text-foreground">Verify your identity to book</p>
          <p className="text-[13px] text-muted-foreground">
            CampShare requires all guests to verify their identity (driver&apos;s licence + selfie) before their first booking.
            {props.minDriverAge > 18 ? ` This van requires drivers aged ${props.minDriverAge}+.` : ""}
          </p>
        </div>
        <a href="/dashboard/profile" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {props.kycStatus === "pending" ? "Continue verification" : props.kycStatus === "failed" ? "Retry verification" : "Verify my identity"}
        </a>
      </div>
    );
  }
  return <BookingRequestFormInner {...props} />;
}

function BookingRequestFormInner({ listingId, nightlyRateCents, minimumNights, instantBook, listingAddons, isLoggedIn }: Props) {
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
  const [authOpen, setAuthOpen]   = useState(false);

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
    if (!isLoggedIn) { setAuthOpen(true); return; }
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
      } else {
        setError("Could not prepare payment. Please try again.");
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
          appearance: {
            theme: "stripe",
            variables: { colorPrimary: "#c2613a", borderRadius: "8px" },
          },
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
    <div className="flex flex-col gap-3">
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          heading="Sign in to book"
          subheading="Create an account or sign in to confirm your dates."
        />
      )}
      {error && <p className={errorCls} role="alert" aria-live="polite">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="booking-start-date" className={fieldLabelCls}>Check-in</label>
          <Input
            id="booking-start-date"
            type="date"
            className="h-9"
            min={todayString()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="booking-end-date" className={fieldLabelCls}>Check-out</label>
          <Input
            id="booking-end-date"
            type="date"
            className="h-9"
            min={startDate || todayString()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-guest-count" className={fieldLabelCls}>Guests</label>
        <Input
          id="booking-guest-count"
          type="number"
          className="h-9"
          min={1}
          max={20}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
        />
      </div>

      {listingAddons.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Add-ons (optional)</p>
          <div className="flex flex-col gap-2">
            {listingAddons.map((addon) => {
              const active = selectedAddonIds.includes(addon.addonId);
              return (
                <label
                  key={addon.addonId}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2",
                    active ? "border-clay bg-clay/10" : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={active}
                    onChange={() => toggleAddon(addon.addonId)}
                  />
                  <span className="flex-1 text-sm text-foreground">{addon.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-clay">
                    +{fmtNzd(addon.priceNZDCents)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-message" className={fieldLabelCls}>Message to host (optional)</label>
        <Textarea
          id="booking-message"
          className="min-h-20"
          placeholder="Introduce yourself and share any details about your trip…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {nights > 0 && nightlyRateCents > 0 && (
        <p className="text-sm text-muted-foreground">
          {nights} night{nights !== 1 ? "s" : ""} · from{" "}
          <strong className="text-foreground">{fmtNzd(nights * nightlyRateCents)} NZD</strong>{" "}
          <span className="text-xs">(+ fees)</span>
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={loading}
        onClick={continueToPayment}
      >
        {loading ? "Checking…" : !isLoggedIn ? "Sign in to book" : instantBook ? "Continue to instant payment" : "Continue to payment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {instantBook
          ? "Payment charged immediately — booking confirmed with no waiting."
          : "Card authorised now — charged only when the host accepts."}
      </p>
    </div>
  );
}
