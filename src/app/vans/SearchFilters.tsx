"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NZ_REGIONS, VAN_TYPES } from "@/lib/constants";

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
}

export default function SearchFilters({ initial }: { initial: FilterValues }) {
  const router = useRouter();
  const [f, setF] = useState<FilterValues>(initial);

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
    };
    setF(empty);
    router.push("/vans");
  }

  const hasFilters = f.region || f.vanType || f.sleeps || f.minRate || f.maxRate ||
    f.petFriendly || f.instantBook || f.startDate || f.endDate;

  return (
    <div style={{
      borderBottom: "1px solid var(--sand-200)",
      padding: "12px 16px",
      background: "var(--sand-50, white)",
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "flex-end",
    }}>
      <div className="cs-field" style={{ margin: 0, minWidth: 140 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Region</label>
        <select className="cs-select" style={{ fontSize: 13 }} value={f.region} onChange={(e) => handleSelect("region", e.target.value)}>
          <option value="">All regions</option>
          {NZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 130 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Van type</label>
        <select className="cs-select" style={{ fontSize: 13 }} value={f.vanType} onChange={(e) => handleSelect("vanType", e.target.value)}>
          <option value="">All types</option>
          {VAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 90 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Sleeps</label>
        <select className="cs-select" style={{ fontSize: 13 }} value={f.sleeps} onChange={(e) => handleSelect("sleeps", e.target.value)}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 90 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Min $</label>
        <input type="number" min={0} className="cs-input" style={{ fontSize: 13 }} placeholder="0" value={f.minRate} onChange={(e) => update("minRate", e.target.value)} />
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 90 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Max $</label>
        <input type="number" min={0} className="cs-input" style={{ fontSize: 13 }} placeholder="Any" value={f.maxRate} onChange={(e) => update("maxRate", e.target.value)} />
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 130 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Check in</label>
        <input type="date" className="cs-input" style={{ fontSize: 13 }} value={f.startDate} onChange={(e) => update("startDate", e.target.value)} />
      </div>

      <div className="cs-field" style={{ margin: 0, minWidth: 130 }}>
        <label className="cs-label" style={{ fontSize: 11, marginBottom: 4 }}>Check out</label>
        <input type="date" className="cs-input" style={{ fontSize: 13 }} value={f.endDate} onChange={(e) => update("endDate", e.target.value)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="cs-checkbox" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={f.petFriendly} onChange={(e) => handleSelect("petFriendly", e.target.checked)} />
          Pets welcome
        </label>
        <label className="cs-checkbox" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={f.instantBook} onChange={(e) => handleSelect("instantBook", e.target.checked)} />
          Instant book
        </label>
      </div>

      {(f.minRate || f.maxRate || f.startDate || f.endDate) && (
        <button type="button" className="cs-btn cs-btn-primary" style={{ fontSize: 13, padding: "6px 14px" }} onClick={() => apply(f)}>
          Search
        </button>
      )}

      {hasFilters && (
        <button type="button" className="cs-btn cs-btn-ghost" style={{ fontSize: 13, padding: "6px 14px" }} onClick={clear}>
          Clear
        </button>
      )}
    </div>
  );
}
