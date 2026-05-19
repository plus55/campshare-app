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
import type { VanListing } from "@/lib/types";

type Step = 1 | 2 | 3;

interface FormState {
  name: string;
  vanType: string;
  year: string;
  sleeps: string;
  seats: string;
  fixedToilet: boolean;
  petFriendly: boolean;
  description: string;
  nightlyRate: string;
  minimumNights: string;
  instantBook: boolean;
  region: string;
  features: string[];
  houseRules: string;
}

function fromListing(l: VanListing | null): FormState {
  if (!l) {
    return {
      name: "", vanType: "", year: "", sleeps: "", seats: "",
      fixedToilet: false, petFriendly: false, description: "",
      nightlyRate: "", minimumNights: "2", instantBook: false,
      region: "", features: [], houseRules: "",
    };
  }
  let features: string[] = [];
  try { features = JSON.parse(l.features) as string[]; } catch { features = []; }
  return {
    name: l.name, vanType: l.vanType, year: String(l.year),
    sleeps: String(l.sleeps), seats: String(l.seats),
    fixedToilet: !!l.fixedToilet, petFriendly: !!l.petFriendly,
    description: l.description, nightlyRate: String(Math.round(l.nightlyRate / 100)),
    minimumNights: String(l.minimumNights), instantBook: !!l.instantBook,
    region: l.region, features, houseRules: l.houseRules,
  };
}

export default function ListingForm({ listing }: { listing: VanListing | null }) {
  const router = useRouter();
  const isNew = !listing;
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(() => fromListing(listing));
  const [saving, setSaving] = useState(false);
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
    if (step === 1) return !!(form.name && form.vanType && form.year && form.sleeps && form.seats && form.description && form.region);
    if (step === 2) return !!(form.nightlyRate && form.minimumNights);
    return true;
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      vanType: form.vanType,
      year: Number(form.year),
      sleeps: Number(form.sleeps),
      seats: Number(form.seats),
      fixedToilet: form.fixedToilet,
      petFriendly: form.petFriendly,
      description: form.description,
      nightlyRate: Math.round(Number(form.nightlyRate) * 100),
      minimumNights: Number(form.minimumNights),
      instantBook: form.instantBook,
      region: form.region,
      features: form.features,
      houseRules: form.houseRules,
    };

    const res = await fetch(
      isNew ? "/api/listings" : `/api/listings/${listing!.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Couldn't save listing.");
      return;
    }
    if (isNew) {
      const { id } = await res.json() as { id: string };
      router.push(`/dashboard/listings/${id}`);
    } else {
      router.refresh();
    }
  }

  const totalSteps = 3;
  const isLastStep = step === totalSteps;

  return (
    <>
      <div className="cs-steps" style={{ marginBottom: 16 }}>
        {([1, 2, 3] as Step[]).map((n) => (
          <div
            key={n}
            className={`cs-step ${n < step ? "is-done" : ""} ${n === step ? "is-active" : ""}`}
          />
        ))}
      </div>

      <div className="cs-card">
        {error && <div className="cs-error">{error}</div>}

        {step === 1 && <StepVan form={form} update={update} island={island} />}
        {step === 2 && <StepPricing form={form} update={update} />}
        {step === 3 && <StepFeatures form={form} update={update} toggleFeature={toggleFeature} island={island} />}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="cs-btn cs-btn-ghost"
            onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
            disabled={step === 1}
          >
            Back
          </button>
          {!isLastStep ? (
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
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : isNew ? "Create listing (draft)" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}

function StepVan({ form, update, island }: StepProps & { island: "North" | "South" }) {
  return (
    <>
      <h2>Your van</h2>
      <div className="cs-field">
        <label className="cs-label">Van name</label>
        <input className="cs-input" placeholder="e.g. Pip the Toyota Hiace" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>
      <div className="cs-field">
        <label className="cs-label">Type</label>
        <select className="cs-select" value={form.vanType} onChange={(e) => update("vanType", e.target.value)}>
          <option value="">Select a type…</option>
          {VAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-label">Year</label>
          <input type="number" className="cs-input" value={form.year} onChange={(e) => update("year", e.target.value)} />
        </div>
        <div className="cs-field">
          <label className="cs-label">Sleeps</label>
          <input type="number" min={1} className="cs-input" value={form.sleeps} onChange={(e) => update("sleeps", e.target.value)} />
        </div>
        <div className="cs-field">
          <label className="cs-label">Seats</label>
          <input type="number" min={1} className="cs-input" value={form.seats} onChange={(e) => update("seats", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-checkbox">
            <input type="checkbox" checked={form.fixedToilet} onChange={(e) => update("fixedToilet", e.target.checked)} />
            Has a fixed toilet
          </label>
        </div>
        <div className="cs-field">
          <label className="cs-checkbox">
            <input type="checkbox" checked={form.petFriendly} onChange={(e) => update("petFriendly", e.target.checked)} />
            Pets welcome
          </label>
        </div>
      </div>
      <div className="cs-field">
        <label className="cs-label">Region</label>
        <select className="cs-select" value={form.region} onChange={(e) => update("region", e.target.value)}>
          <option value="">Select a region…</option>
          {NZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {form.region && <p className="cs-muted cs-small" style={{ marginTop: 6 }}>{island} Island</p>}
      </div>
      <div className="cs-field">
        <label className="cs-label">Description</label>
        <textarea className="cs-textarea" placeholder="What makes your van a great trip?" value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>
    </>
  );
}

function StepPricing({ form, update }: StepProps) {
  return (
    <>
      <h2>Pricing</h2>
      <div className="cs-field">
        <label className="cs-label">Nightly rate (NZD)</label>
        <input type="number" min={1} className="cs-input" value={form.nightlyRate} onChange={(e) => update("nightlyRate", e.target.value)} />
        <p className="cs-muted cs-small" style={{ marginTop: 4 }}>Enter dollars, e.g. 150 for $150/night.</p>
      </div>
      <div className="cs-field">
        <label className="cs-label">Minimum nights</label>
        <select className="cs-select" value={form.minimumNights} onChange={(e) => update("minimumNights", e.target.value)}>
          {MINIMUM_NIGHTS.map((n) => <option key={n} value={n}>{n} {n === 1 ? "night" : "nights"}</option>)}
        </select>
      </div>
      <div className="cs-field">
        <label className="cs-checkbox">
          <input type="checkbox" checked={form.instantBook} onChange={(e) => update("instantBook", e.target.checked)} />
          Allow instant book (no manual approval per booking)
        </label>
      </div>
    </>
  );
}

function StepFeatures({ form, update, toggleFeature, island }: StepProps & { toggleFeature: (name: string) => void; island: "North" | "South" }) {
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
        <textarea className="cs-textarea" placeholder="e.g. No smoking. Please return with the same level of fuel." value={form.houseRules} onChange={(e) => update("houseRules", e.target.value)} />
      </div>
      <hr style={{ border: "none", borderTop: "1px solid var(--sand-200)", margin: "20px 0" }} />
      <h3>Review</h3>
      <ul className="cs-small cs-muted" style={{ paddingLeft: 18 }}>
        <li>{form.name} · {form.vanType} · {form.year} · sleeps {form.sleeps}</li>
        <li>{form.region} ({island})</li>
        <li>${form.nightlyRate}/night · min {form.minimumNights} nights{form.instantBook ? " · instant book" : ""}</li>
        <li>{form.features.length} feature{form.features.length === 1 ? "" : "s"}{form.petFriendly ? " · pet friendly" : ""}</li>
      </ul>
    </>
  );
}
