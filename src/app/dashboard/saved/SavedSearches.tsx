"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

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
      <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <p className="mb-2 font-semibold text-foreground">No saved searches yet</p>
        <p className="mb-5 text-[13px] text-muted-foreground">
          Apply filters on Browse vans, then tap &ldquo;Save search&rdquo; to get email alerts when new matching vans are listed.
        </p>
        <Link href="/vans" className={buttonVariants()}>Browse vans</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {searches.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{describeFilters(s.filters)}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Saved {fmtRelative(s.createdAt)}
              {s.lastAlertedAt !== null && ` · Last alert ${fmtRelative(s.lastAlertedAt)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/vans?${filtersToQueryString(s.filters)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Run</Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDelete(s.id)}
              disabled={deletingId === s.id}
            >
              {deletingId === s.id ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
