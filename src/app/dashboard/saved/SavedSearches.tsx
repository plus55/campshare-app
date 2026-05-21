"use client";

import { useState } from "react";
import Link from "next/link";

interface SavedSearch {
  id: string;
  label: string | null;
  filters: Record<string, string>;
  lastAlertedAt: number | null;
  createdAt: number;
}

function describeFilters(f: Record<string, string>): string {
  const parts: string[] = [];
  if (f.region) parts.push(`Region: ${f.region}`);
  if (f.vanType) parts.push(`Type: ${f.vanType}`);
  if (f.sleeps) parts.push(`Sleeps ${f.sleeps}+`);
  if (f.minRate && f.maxRate) parts.push(`$${f.minRate}–$${f.maxRate}`);
  else if (f.maxRate) parts.push(`Under $${f.maxRate}`);
  else if (f.minRate) parts.push(`From $${f.minRate}`);
  if (f.petFriendly === "1") parts.push("Pet-friendly");
  if (f.instantBook === "1") parts.push("Instant book");
  if (f.startDate && f.endDate) parts.push(`${f.startDate} → ${f.endDate}`);
  return parts.length === 0 ? "Any van" : parts.join(" · ");
}

function filtersToQueryString(f: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) p.set(k, v);
  return p.toString();
}

function fmtRelative(unixSec: number): string {
  const ageDays = Math.floor((Date.now() / 1000 - unixSec) / 86400);
  if (ageDays === 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  if (ageDays < 7) return `${ageDays} days ago`;
  if (ageDays < 30) return `${Math.floor(ageDays / 7)} weeks ago`;
  return `${Math.floor(ageDays / 30)} months ago`;
}

export function SavedSearches({ initial }: { initial: SavedSearch[] }) {
  const [searches, setSearches] = useState<SavedSearch[]>(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved search?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSearches((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }

  if (searches.length === 0) {
    return (
      <div className="cs-card" style={{ textAlign: "center", padding: 48 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>No saved searches yet</p>
        <p className="cs-muted cs-small" style={{ marginBottom: 20 }}>
          Apply filters on Browse vans, then tap &ldquo;Save search&rdquo; to get email alerts when new matching vans are listed.
        </p>
        <Link href="/vans" className="cs-btn cs-btn-primary">Browse vans</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {searches.map((s) => (
        <div key={s.id} className="cs-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{describeFilters(s.filters)}</p>
            <p className="cs-muted cs-small" style={{ margin: "4px 0 0" }}>
              Saved {fmtRelative(s.createdAt)}
              {s.lastAlertedAt !== null && ` · Last alert ${fmtRelative(s.lastAlertedAt)}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href={`/vans?${filtersToQueryString(s.filters)}`}
              className="cs-btn cs-btn-ghost"
              style={{ fontSize: 13, padding: "6px 14px" }}
            >
              Run
            </Link>
            <button
              type="button"
              className="cs-btn cs-btn-ghost"
              style={{ fontSize: 13, padding: "6px 14px" }}
              onClick={() => handleDelete(s.id)}
              disabled={deletingId === s.id}
            >
              {deletingId === s.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
