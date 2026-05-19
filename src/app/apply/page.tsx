"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  MINIMUM_NIGHTS,
  NORTH_ISLAND_REGIONS,
  NZ_REGIONS,
  VAN_FEATURES,
  VAN_TYPES,
} from "@/lib/constants";

type Step = 1 | 2 | 3 | 4;

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;

  vanName: string;
  vanType: string;
  vanYear: string;
  sleeps: string;
  seats: string;
  fixedToilet: boolean;
  description: string;

  nightlyRate: string;
  minimumNights: string;
  availableFrom: string;
  availableTo: string;
  instantBook: boolean;

  features: string[];
  houseRules: string;
  petFriendly: boolean;
}

const initial: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  region: "",
  vanName: "",
  vanType: "",
  vanYear: "",
  sleeps: "",
  seats: "",
  fixedToilet: false,
  description: "",
  nightlyRate: "",
  minimumNights: "2",
  availableFrom: "",
  availableTo: "",
  instantBook: false,
  features: [],
  houseRules: "",
  petFriendly: false,
};

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const island = useMemo(
    () => (NORTH_ISLAND_REGIONS.has(form.region) ? "North" : "South"),
    [form.region]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleFeature(name: string) {
    setForm((f) => ({
      ...f,
      features: f.features.includes(name)
        ? f.features.filter((x) => x !== name)
        : [...f.features, name],
    }));
  }

  function canAdvance(): boolean {
    if (step === 1) {
      return !!(form.firstName && form.lastName && form.phone && form.region);
    }
    if (step === 2) {
      return !!(
        form.vanName &&
        form.vanType &&
        form.vanYear &&
        form.sleeps &&
        form.seats &&
        form.description
      );
    }
    if (step === 3) {
      return !!(form.nightlyRate && form.minimumNights);
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      region: form.region,
      island,
      vanName: form.vanName,
      vanType: form.vanType,
      vanYear: Number(form.vanYear),
      sleeps: Number(form.sleeps),
      seats: Number(form.seats),
      fixedToilet: form.fixedToilet,
      description: form.description,
      nightlyRate: Number(form.nightlyRate),
      minimumNights: Number(form.minimumNights),
      availableFrom: form.availableFrom || null,
      availableTo: form.availableTo || null,
      instantBook: form.instantBook,
      features: form.features,
      houseRules: form.houseRules,
      petFriendly: form.petFriendly,
    };

    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Couldn't submit your application.");
      return;
    }
    router.push("/apply/submitted");
  }

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <span className="cs-brand">CampShare</span>
        <h1>Host application</h1>
        <p className="cs-muted">
          Four short steps. Takes about five minutes.
        </p>

        <div className="cs-steps" style={{ marginTop: 24 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`cs-step ${n < step ? "is-done" : ""} ${
                n === step ? "is-active" : ""
              }`}
            />
          ))}
        </div>

        <div className="cs-card">
          {error && <div className="cs-error">{error}</div>}

          {step === 1 && <StepAbout form={form} update={update} island={island} />}
          {step === 2 && <StepVan form={form} update={update} />}
          {step === 3 && <StepPricing form={form} update={update} />}
          {step === 4 && (
            <StepFeatures
              form={form}
              update={update}
              toggleFeature={toggleFeature}
              island={island}
            />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="cs-btn cs-btn-ghost"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1}
            >
              Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canAdvance()}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ----------- step components ----------- */

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}

function StepAbout({
  form,
  update,
  island,
}: StepProps & { island: "North" | "South" }) {
  return (
    <>
      <h2>About you</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-label">First name</label>
          <input
            className="cs-input"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </div>
        <div className="cs-field">
          <label className="cs-label">Last name</label>
          <input
            className="cs-input"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </div>
      </div>
      <div className="cs-field">
        <label className="cs-label">Phone</label>
        <input
          type="tel"
          className="cs-input"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>
      <div className="cs-field">
        <label className="cs-label">Region</label>
        <select
          className="cs-select"
          value={form.region}
          onChange={(e) => update("region", e.target.value)}
        >
          <option value="">Select a region…</option>
          {NZ_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {form.region && (
          <p className="cs-muted cs-small" style={{ marginTop: 6 }}>
            {island} Island
          </p>
        )}
      </div>
    </>
  );
}

function StepVan({ form, update }: StepProps) {
  return (
    <>
      <h2>Your van</h2>
      <div className="cs-field">
        <label className="cs-label">Van name</label>
        <input
          className="cs-input"
          placeholder="e.g. Pip the Toyota Hiace"
          value={form.vanName}
          onChange={(e) => update("vanName", e.target.value)}
        />
      </div>
      <div className="cs-field">
        <label className="cs-label">Type</label>
        <select
          className="cs-select"
          value={form.vanType}
          onChange={(e) => update("vanType", e.target.value)}
        >
          <option value="">Select a type…</option>
          {VAN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-label">Year</label>
          <input
            type="number"
            className="cs-input"
            value={form.vanYear}
            onChange={(e) => update("vanYear", e.target.value)}
          />
        </div>
        <div className="cs-field">
          <label className="cs-label">Sleeps</label>
          <input
            type="number"
            min={1}
            className="cs-input"
            value={form.sleeps}
            onChange={(e) => update("sleeps", e.target.value)}
          />
        </div>
        <div className="cs-field">
          <label className="cs-label">Seats</label>
          <input
            type="number"
            min={1}
            className="cs-input"
            value={form.seats}
            onChange={(e) => update("seats", e.target.value)}
          />
        </div>
      </div>
      <div className="cs-field">
        <label className="cs-checkbox">
          <input
            type="checkbox"
            checked={form.fixedToilet}
            onChange={(e) => update("fixedToilet", e.target.checked)}
          />
          Has a fixed toilet
        </label>
      </div>
      <div className="cs-field">
        <label className="cs-label">Description</label>
        <textarea
          className="cs-textarea"
          placeholder="What makes your van a great trip?"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
    </>
  );
}

function StepPricing({ form, update }: StepProps) {
  return (
    <>
      <h2>Pricing &amp; availability</h2>
      <div className="cs-field">
        <label className="cs-label">Nightly rate (NZD)</label>
        <input
          type="number"
          min={0}
          className="cs-input"
          value={form.nightlyRate}
          onChange={(e) => update("nightlyRate", e.target.value)}
        />
      </div>
      <div className="cs-field">
        <label className="cs-label">Minimum nights</label>
        <select
          className="cs-select"
          value={form.minimumNights}
          onChange={(e) => update("minimumNights", e.target.value)}
        >
          {MINIMUM_NIGHTS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "night" : "nights"}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-label">Available from (optional)</label>
          <input
            type="date"
            className="cs-input"
            value={form.availableFrom}
            onChange={(e) => update("availableFrom", e.target.value)}
          />
        </div>
        <div className="cs-field">
          <label className="cs-label">Available to (optional)</label>
          <input
            type="date"
            className="cs-input"
            value={form.availableTo}
            onChange={(e) => update("availableTo", e.target.value)}
          />
        </div>
      </div>
      <div className="cs-field">
        <label className="cs-checkbox">
          <input
            type="checkbox"
            checked={form.instantBook}
            onChange={(e) => update("instantBook", e.target.checked)}
          />
          Allow instant book (no manual approval per booking)
        </label>
      </div>
    </>
  );
}

function StepFeatures({
  form,
  update,
  toggleFeature,
  island,
}: StepProps & {
  toggleFeature: (name: string) => void;
  island: "North" | "South";
}) {
  return (
    <>
      <h2>Features &amp; house rules</h2>

      <p className="cs-label">Features</p>
      <div className="cs-tags" style={{ marginBottom: 16 }}>
        {VAN_FEATURES.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => toggleFeature(f)}
            className={`cs-tag ${form.features.includes(f) ? "is-active" : ""}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="cs-field">
        <label className="cs-label">House rules</label>
        <textarea
          className="cs-textarea"
          placeholder="e.g. No smoking. Please return with the same level of fuel."
          value={form.houseRules}
          onChange={(e) => update("houseRules", e.target.value)}
        />
      </div>

      <div className="cs-field">
        <label className="cs-checkbox">
          <input
            type="checkbox"
            checked={form.petFriendly}
            onChange={(e) => update("petFriendly", e.target.checked)}
          />
          Pets welcome
        </label>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--sand-200)",
          margin: "20px 0",
        }}
      />

      <h3>Review</h3>
      <ul className="cs-small cs-muted" style={{ paddingLeft: 18 }}>
        <li>
          {form.firstName} {form.lastName} · {form.region} ({island})
        </li>
        <li>
          {form.vanName} · {form.vanType} · {form.vanYear} · sleeps{" "}
          {form.sleeps}
        </li>
        <li>
          ${form.nightlyRate}/night · min {form.minimumNights} nights
          {form.instantBook ? " · instant book" : ""}
        </li>
        <li>
          {form.features.length} feature
          {form.features.length === 1 ? "" : "s"}
          {form.petFriendly ? " · pet friendly" : ""}
        </li>
      </ul>
    </>
  );
}
