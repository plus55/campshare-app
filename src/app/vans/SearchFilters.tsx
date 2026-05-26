"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NZ_REGIONS, VAN_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldCls = "flex flex-col gap-1";
const fieldLabelCls = "text-[11px] font-medium text-muted-foreground";
const selectCls =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const checkboxLabelCls = "flex cursor-pointer items-center gap-2 text-[13px] text-foreground";

export interface FilterValues {
  region: string;
  vanType: string;
  sleeps: string;
  minRate: string;
  maxRate: string;
  petFriendly: boolean;
  instantBook: boolean;
  startDate: string;
  endDate: string;
  sort: string;
}

export default function SearchFilters({ initial, isLoggedIn = false }: { initial: FilterValues; isLoggedIn?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<FilterValues>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function apply(next: FilterValues) {
    const p = new URLSearchParams();
    if (next.region) p.set("region", next.region);
    if (next.vanType) p.set("vanType", next.vanType);
    if (next.sleeps) p.set("sleeps", next.sleeps);
    if (next.minRate) p.set("minRate", next.minRate);
    if (next.maxRate) p.set("maxRate", next.maxRate);
    if (next.petFriendly) p.set("petFriendly", "1");
    if (next.instantBook) p.set("instantBook", "1");
    if (next.startDate) p.set("startDate", next.startDate);
    if (next.endDate) p.set("endDate", next.endDate);
    if (next.sort && next.sort !== "newest") p.set("sort", next.sort);
    router.push(`/vans${p.size > 0 ? `?${p.toString()}` : ""}`);
  }

  function handleSelect<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    const next = { ...f, [key]: value };
    setF(next);
    apply(next);
  }

  function clear() {
    const empty: FilterValues = {
      region: "", vanType: "", sleeps: "", minRate: "", maxRate: "",
      petFriendly: false, instantBook: false, startDate: "", endDate: "",
      sort: "newest",
    };
    setF(empty);
    router.push("/vans");
  }

  const hasFilters = f.region || f.vanType || f.sleeps || f.minRate || f.maxRate ||
    f.petFriendly || f.instantBook || f.startDate || f.endDate;

  async function saveSearch() {
    setSaving(true);
    setSaveError(null);
    try {
      const filters: Record<string, string> = {};
      if (f.region) filters.region = f.region;
      if (f.vanType) filters.vanType = f.vanType;
      if (f.sleeps) filters.sleeps = f.sleeps;
      if (f.minRate) filters.minRate = f.minRate;
      if (f.maxRate) filters.maxRate = f.maxRate;
      if (f.petFriendly) filters.petFriendly = "1";
      if (f.instantBook) filters.instantBook = "1";
      if (f.startDate) filters.startDate = f.startDate;
      if (f.endDate) filters.endDate = f.endDate;
      if (f.sort && f.sort !== "newest") filters.sort = f.sort;
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2400);
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setSaveError(body.error ?? "Could not save this search.");
      }
    } catch {
      setSaveError("Could not save this search. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5 border-b border-border bg-card px-4 py-3">
      <div className={`${fieldCls} min-w-[140px]`}>
        <Label htmlFor="search-region" className={fieldLabelCls}>Region</Label>
        <select id="search-region" className={selectCls} value={f.region} onChange={(e) => handleSelect("region", e.target.value)}>
          <option value="">All regions</option>
          {NZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className={`${fieldCls} min-w-[130px]`}>
        <Label htmlFor="search-van-type" className={fieldLabelCls}>Van type</Label>
        <select id="search-van-type" className={selectCls} value={f.vanType} onChange={(e) => handleSelect("vanType", e.target.value)}>
          <option value="">All types</option>
          {VAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className={`${fieldCls} min-w-[90px]`}>
        <Label htmlFor="search-sleeps" className={fieldLabelCls}>Sleeps</Label>
        <select id="search-sleeps" className={selectCls} value={f.sleeps} onChange={(e) => handleSelect("sleeps", e.target.value)}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>

      <div className={`${fieldCls} min-w-[90px]`}>
        <Label htmlFor="search-min-rate" className={fieldLabelCls}>Min $</Label>
        <Input id="search-min-rate" type="number" min={0} className="h-9 text-[13px]" placeholder="0" value={f.minRate} onChange={(e) => update("minRate", e.target.value)} />
      </div>

      <div className={`${fieldCls} min-w-[90px]`}>
        <Label htmlFor="search-max-rate" className={fieldLabelCls}>Max $</Label>
        <Input id="search-max-rate" type="number" min={0} className="h-9 text-[13px]" placeholder="Any" value={f.maxRate} onChange={(e) => update("maxRate", e.target.value)} />
      </div>

      <div className={`${fieldCls} min-w-[130px]`}>
        <Label htmlFor="search-start-date" className={fieldLabelCls}>Check in</Label>
        <Input id="search-start-date" type="date" className="h-9 text-[13px]" value={f.startDate} onChange={(e) => update("startDate", e.target.value)} />
      </div>

      <div className={`${fieldCls} min-w-[130px]`}>
        <Label htmlFor="search-end-date" className={fieldLabelCls}>Check out</Label>
        <Input id="search-end-date" type="date" className="h-9 text-[13px]" value={f.endDate} onChange={(e) => update("endDate", e.target.value)} />
      </div>

      <div className={`${fieldCls} min-w-[130px]`}>
        <Label htmlFor="search-sort" className={fieldLabelCls}>Sort by</Label>
        <select id="search-sort" className={selectCls} value={f.sort} onChange={(e) => handleSelect("sort", e.target.value)}>
          <option value="newest">Newest</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={checkboxLabelCls}>
          <input type="checkbox" className="size-3.5 accent-primary" checked={f.petFriendly} onChange={(e) => handleSelect("petFriendly", e.target.checked)} />
          Pets welcome
        </label>
        <label className={checkboxLabelCls}>
          <input type="checkbox" className="size-3.5 accent-primary" checked={f.instantBook} onChange={(e) => handleSelect("instantBook", e.target.checked)} />
          Instant book
        </label>
      </div>

      {(f.minRate || f.maxRate || f.startDate || f.endDate) && (
        <Button type="button" size="sm" className="h-9" onClick={() => apply(f)}>
          Search
        </Button>
      )}

      {hasFilters && (
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={clear}>
          Clear
        </Button>
      )}

      {hasFilters && isLoggedIn && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={saveSearch}
          disabled={saving || saved}
          aria-label="Save this search"
          title="Get email alerts when matching vans are listed"
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save search"}
        </Button>
      )}
      {hasFilters && isLoggedIn && saveError && (
        <p role="alert" aria-live="polite" className="text-xs text-destructive">{saveError}</p>
      )}
    </div>
  );
}
