"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NZ_REGIONS, NORTH_ISLAND_REGIONS } from "@/lib/constants";
import type { HostProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const fieldCls = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-foreground";
const errorCls = "mb-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive";

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
    <div className="rounded-2xl border border-border bg-card p-6">
      {error && <div className={errorCls} role="alert" aria-live="polite">{error}</div>}
      {saved && <p className="mb-3 text-sm text-moss" aria-live="polite">Profile saved.</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label htmlFor="profile-first-name" className={labelCls}>First name</label>
          <Input id="profile-first-name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
        </div>
        <div className={fieldCls}>
          <label htmlFor="profile-last-name" className={labelCls}>Last name</label>
          <Input id="profile-last-name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </div>
      </div>

      <div className={`${fieldCls} mt-3`}>
        <label htmlFor="profile-phone" className={labelCls}>Phone</label>
        <Input id="profile-phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className={`${fieldCls} mt-3`}>
        <label htmlFor="profile-region" className={labelCls}>Region</label>
        <select id="profile-region" className={selectCls} value={form.region} onChange={(e) => update("region", e.target.value)}>
          <option value="">Select a region…</option>
          {NZ_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {form.region && (
          <p className="mt-1 text-[12px] text-muted-foreground">{island} Island</p>
        )}
      </div>

      <div className={`${fieldCls} mt-3`}>
        <label htmlFor="profile-bio" className={labelCls}>Bio (optional)</label>
        <Textarea
          id="profile-bio"
          className="min-h-[100px]"
          placeholder="Tell travellers a little about yourself…"
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
        />
      </div>

      <Button
        type="button"
        className="mt-4"
        onClick={save}
        disabled={saving || !canSave}
      >
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
