"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NZ_REGIONS, NORTH_ISLAND_REGIONS } from "@/lib/constants";
import type { HostProfile } from "@/lib/types";

interface Props {
  profile: HostProfile | null;
}

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  bio: string;
}

export default function EditProfileForm({ profile }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    phone: profile?.phone ?? "",
    region: profile?.region ?? "",
    bio: profile?.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const island = useMemo(
    () => (NORTH_ISLAND_REGIONS.has(form.region) ? "North" : "South"),
    [form.region]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const canSave = !!(form.firstName && form.lastName && form.phone && form.region);

  async function save() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "Couldn't save profile.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="cs-card">
      {error && <div className="cs-error">{error}</div>}
      {saved && <p style={{ color: "green", marginBottom: 12 }}>Profile saved.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="cs-field">
          <label className="cs-label">First name</label>
          <input className="cs-input" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
        </div>
        <div className="cs-field">
          <label className="cs-label">Last name</label>
          <input className="cs-input" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </div>
      </div>

      <div className="cs-field">
        <label className="cs-label">Phone</label>
        <input type="tel" className="cs-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className="cs-field">
        <label className="cs-label">Region</label>
        <select className="cs-select" value={form.region} onChange={(e) => update("region", e.target.value)}>
          <option value="">Select a region…</option>
          {NZ_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {form.region && (
          <p className="cs-muted cs-small" style={{ marginTop: 6 }}>{island} Island</p>
        )}
      </div>

      <div className="cs-field">
        <label className="cs-label">Bio (optional)</label>
        <textarea
          className="cs-textarea"
          placeholder="Tell travellers a little about yourself…"
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
        />
      </div>

      <button
        type="button"
        className="cs-btn cs-btn-primary"
        onClick={save}
        disabled={saving || !canSave}
        style={{ marginTop: 8 }}
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
